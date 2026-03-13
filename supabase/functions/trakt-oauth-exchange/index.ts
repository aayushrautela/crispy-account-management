import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOG_PREFIX = '[trakt-oauth-exchange]';

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function maskValue(value: string | null | undefined, visible = 4): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length <= visible) {
    return trimmed;
  }

  return `${trimmed.slice(0, visible)}...${trimmed.slice(-visible)}`;
}

function logEvent(event: string, details: Record<string, unknown> = {}, level: 'info' | 'warn' | 'error' = 'info') {
  console[level](`${LOG_PREFIX} ${event}`, details);
}

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

async function fetchTraktProfile(accessToken: string, clientId: string) {
  logEvent('fetching Trakt profile', {
    hasAccessToken: accessToken.length > 0,
  });

  const response = await fetch('https://api.trakt.tv/users/settings', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'trakt-api-key': clientId,
      'trakt-api-version': '2',
    },
  });

  if (!response.ok) {
    logEvent('Trakt profile request failed', {
      status: response.status,
      statusText: response.statusText,
    }, 'warn');
    return {
      providerUserId: null,
      providerUsername: null,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const user = isRecord(payload?.user) ? payload.user : null;
  const ids = user && isRecord(user.ids) ? user.ids : null;

  logEvent('Trakt profile request succeeded', {
    providerUserId: typeof ids?.slug === 'string' ? ids.slug : null,
    providerUsername: typeof user?.username === 'string' ? user.username : null,
  });

  return {
    providerUserId: typeof ids?.slug === 'string' ? ids.slug : null,
    providerUsername: typeof user?.username === 'string' ? user.username : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const clientId = readRequiredEnv('TRAKT_CLIENT_ID');
    const clientSecret = readRequiredEnv('TRAKT_CLIENT_SECRET');
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const codeVerifier = typeof body?.codeVerifier === 'string' ? body.codeVerifier.trim() : '';
    const redirectUri = typeof body?.redirectUri === 'string' ? body.redirectUri.trim() : '';

    logEvent('received Trakt OAuth exchange request', {
      hasBody: Boolean(body),
      code: maskValue(code),
      codeVerifierLength: codeVerifier.length,
      redirectUri,
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin'),
    });

    if (!code || !codeVerifier || !redirectUri) {
      logEvent('Trakt OAuth exchange request missing required fields', {
        hasCode: Boolean(code),
        hasCodeVerifier: Boolean(codeVerifier),
        hasRedirectUri: Boolean(redirectUri),
      }, 'warn');
      return jsonResponse(400, { error: 'Missing code, codeVerifier, or redirectUri.' });
    }

    logEvent('requesting Trakt access token', {
      redirectUri,
      code: maskValue(code),
      codeVerifierLength: codeVerifier.length,
      hasClientSecret: clientSecret.length > 0,
    });

    const response = await fetch('https://api.trakt.tv/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-key': clientId,
        'trakt-api-version': '2',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    logEvent('received Trakt token response', {
      status: response.status,
      statusText: response.statusText,
      payloadKeys: payload ? Object.keys(payload) : null,
      error: typeof payload?.error === 'string' ? payload.error : null,
      errorDescription: typeof payload?.error_description === 'string' ? payload.error_description : null,
    }, response.ok ? 'info' : 'warn');

    if (!response.ok || !payload || typeof payload.access_token !== 'string') {
      return jsonResponse(response.status || 502, {
        error:
          typeof payload?.error_description === 'string'
            ? payload.error_description
            : typeof payload?.error === 'string'
              ? payload.error
              : 'Unable to exchange the Trakt authorization code.',
      });
    }

    const profile = await fetchTraktProfile(payload.access_token, clientId);

    logEvent('Trakt OAuth exchange completed', {
      providerUserId: profile.providerUserId,
      providerUsername: profile.providerUsername,
      hasRefreshToken: typeof payload.refresh_token === 'string' && payload.refresh_token.length > 0,
      scope: typeof payload.scope === 'string' ? payload.scope : null,
    });

    return jsonResponse(200, {
      ...payload,
      ...profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Trakt OAuth error.';
    logEvent('Trakt OAuth exchange crashed', {
      message,
    }, 'error');
    return jsonResponse(500, { error: message });
  }
});
