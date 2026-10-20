import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { challongeRequest, requestTokens, saveConnection } from '../_shared/challongeOAuth.ts';

Deno.serve(async request => {
  const fallbackUrl = 'https://scdg.pro/A9xQ7mLp42Zr';
  let returnUrl = fallbackUrl;
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    if (oauthError) throw new Error(url.searchParams.get('error_description') || oauthError);
    if (!code || !state) throw new Error('Missing OAuth code or state.');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: stateRow, error: stateError } = await admin
      .from('scoring_challonge_oauth_states')
      .delete()
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .select('*')
      .single();
    if (stateError || !stateRow) throw new Error('OAuth request expired or is invalid.');
    returnUrl = stateRow.return_url;

    const tokens = await requestTokens({
      grant_type: 'authorization_code',
      code,
      redirect_uri: Deno.env.get('CHALLONGE_REDIRECT_URI')!,
    });
    const me = await challongeRequest('/me.json', tokens.access_token);
    await saveConnection(admin, stateRow.user_id, tokens, { id: me.data?.id, ...me.data?.attributes });

    const destination = new URL(returnUrl);
    destination.searchParams.set('challonge', 'connected');
    return Response.redirect(destination.toString(), 302);
  } catch (error) {
    const destination = new URL(returnUrl);
    destination.searchParams.set('challonge', 'error');
    destination.searchParams.set('message', error instanceof Error ? error.message : 'Connection failed.');
    return Response.redirect(destination.toString(), 302);
  }
});
