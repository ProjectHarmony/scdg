import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('CHALLONGE_CLIENT_ID');
    const redirectUri = Deno.env.get('CHALLONGE_REDIRECT_URI');
    if (!clientId || !redirectUri) throw new Error('Challonge OAuth secrets are not configured.');

    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required.' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
    if (profile?.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const { returnUrl } = await request.json();
    const parsedReturnUrl = new URL(String(returnUrl || 'https://scdg.pro/A9xQ7mLp42Zr'));
    const allowedHosts = ['scdg.pro', 'www.scdg.pro', '127.0.0.1:4173', 'localhost:5173'];
    if (!allowedHosts.includes(parsedReturnUrl.host)) throw new Error('Invalid return URL.');

    const state = crypto.randomUUID();
    const { error: stateError } = await admin.from('scoring_challonge_oauth_states').insert({
      state,
      user_id: userData.user.id,
      return_url: parsedReturnUrl.toString(),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (stateError) throw new Error(stateError.message);

    const url = new URL('https://api.challonge.com/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'me tournaments:read matches:read matches:write participants:read communities:manage');
    url.searchParams.set('state', state);
    return json({ authorizationUrl: url.toString() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not start Challonge authorization.' }, 400);
  }
});
