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

async function fetchSimklSettings(accessToken: string, clientId: string) {
  const response = await fetch('https://api.simkl.com/users/settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'simkl-api-key': clientId,
    },
  });

  if (!response.ok) {
    return {
      providerUserId: null,
      providerUsername: null,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const account = payload && isRecord(payload.account) ? payload.account : null;
  const user = payload && isRecord(payload.user) ? payload.user : null;

  return {
    providerUserId:
      typeof account?.id === 'number' || typeof account?.id === 'string' ? String(account.id) : null,
    providerUsername: typeof user?.name === 'string' ? user.name : null,
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
    const clientId = readRequiredEnv('SIMKL_CLIENT_ID');
    const clientSecret = readRequiredEnv('SIMKL_CLIENT_SECRET');
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const redirectUri = typeof body?.redirectUri === 'string' ? body.redirectUri.trim() : '';

    if (!code || !redirectUri) {
      return jsonResponse(400, { error: 'Missing code or redirectUri.' });
    }

    const response = await fetch('https://api.simkl.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
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
              : 'Unable to exchange the SIMKL authorization code.',
      });
    }

    const profile = await fetchSimklSettings(payload.access_token, clientId);

    return jsonResponse(200, {
      ...payload,
      ...profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected SIMKL OAuth error.';
    return jsonResponse(500, { error: message });
  }
});
