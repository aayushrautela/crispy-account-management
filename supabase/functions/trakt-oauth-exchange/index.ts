import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

async function fetchTraktProfile(accessToken: string, clientId: string) {
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
    return {
      providerUserId: null,
      providerUsername: null,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const user = isRecord(payload?.user) ? payload.user : null;
  const ids = user && isRecord(user.ids) ? user.ids : null;

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
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const codeVerifier = typeof body?.codeVerifier === 'string' ? body.codeVerifier.trim() : '';
    const redirectUri = typeof body?.redirectUri === 'string' ? body.redirectUri.trim() : '';

    if (!code || !codeVerifier || !redirectUri) {
      return jsonResponse(400, { error: 'Missing code, codeVerifier, or redirectUri.' });
    }

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
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

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

    return jsonResponse(200, {
      ...payload,
      ...profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Trakt OAuth error.';
    return jsonResponse(500, { error: message });
  }
});
