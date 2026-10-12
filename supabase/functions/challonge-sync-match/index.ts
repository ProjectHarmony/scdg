import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { challongeRequest, getAccessToken } from '../_shared/challongeOAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'The Edge Function secrets are not configured.' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Invalid session.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let matchId = '';

  try {
    const body = await request.json();
    matchId = String(body.matchId || '');
    if (!matchId) throw new Error('A match ID is required.');

    const { data: match, error: matchError } = await admin
      .from('scoring_matches')
      .select('id,tournament_id,challonge_match_id,assigned_judge_id,entry_a_id,entry_b_id,score_a,score_b,winner_entry_id,status')
      .eq('id', matchId)
      .single();
    if (matchError) throw matchError;

    const [{ data: profile }, { data: membership }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle(),
      admin.from('scoring_memberships')
        .select('role')
        .eq('tournament_id', match.tournament_id)
        .eq('user_id', userData.user.id)
        .maybeSingle(),
    ]);
    const canSync = profile?.role === 'admin'
      || match.assigned_judge_id === userData.user.id
      || ['organizer', 'head_judge'].includes(membership?.role);
    if (!canSync) return json({ error: 'You cannot sync this match.' }, 403);

    if (match.status === 'synced') return json({ synced: true, alreadySynced: true });
    if (!['complete', 'sync_failed'].includes(match.status) || !match.winner_entry_id) {
      throw new Error('Only completed matches can be synced.');
    }

    const [{ data: tournament, error: tournamentError }, { data: entries, error: entriesError }] = await Promise.all([
      admin.from('scoring_tournaments')
        .select('challonge_tournament_id,challonge_community_id,owner_id')
        .eq('id', match.tournament_id)
        .single(),
      admin.from('scoring_entries')
        .select('id,challonge_participant_id')
        .in('id', [match.entry_a_id, match.entry_b_id]),
    ]);
    if (tournamentError) throw tournamentError;
    if (entriesError) throw entriesError;

    if (Number(tournament.challonge_tournament_id) < 0 || Number(match.challonge_match_id) < 0) {
      return json({ synced: false, skipped: true, reason: 'Local demo match.' });
    }

    const entryA = entries.find(entry => entry.id === match.entry_a_id);
    const entryB = entries.find(entry => entry.id === match.entry_b_id);
    if (!entryA || !entryB) throw new Error('Challonge participants are missing for this match.');

    const matchReport = [
      {
        participant_id: String(entryA.challonge_participant_id),
        score_set: String(match.score_a),
        advancing: match.winner_entry_id === match.entry_a_id,
      },
      {
        participant_id: String(entryB.challonge_participant_id),
        score_set: String(match.score_b),
        advancing: match.winner_entry_id === match.entry_b_id,
      },
    ];
    const accessToken = await getAccessToken(admin, tournament.owner_id);
    const communityQuery = tournament.challonge_community_id
      ? `?community_id=${encodeURIComponent(tournament.challonge_community_id)}`
      : '';
    const responseBody = await challongeRequest(
      `/tournaments/${encodeURIComponent(tournament.challonge_tournament_id)}/matches/${encodeURIComponent(match.challonge_match_id)}.json${communityQuery}`,
      accessToken,
      {
      method: 'PUT',
        body: JSON.stringify({ data: { type: 'match', attributes: { match: matchReport } } }),
      },
    );

    await admin.from('scoring_sync_log').insert({
      match_id: match.id,
      operation: 'challonge_match_update',
      request_payload: {
        match: matchReport,
      },
      response_status: 200,
      response_body: responseBody,
    });

    const { error: updateError } = await admin
      .from('scoring_matches')
      .update({ status: 'synced', synced_at: new Date().toISOString() })
      .eq('id', match.id);
    if (updateError) throw updateError;

    return json({ synced: true });
  } catch (error) {
    if (matchId) {
      await admin.from('scoring_matches')
        .update({ status: 'sync_failed' })
        .eq('id', matchId)
        .in('status', ['complete', 'sync_failed']);
      await admin.from('scoring_sync_log').insert({
        match_id: matchId,
        operation: 'challonge_match_update_error',
        response_status: 500,
        response_body: { error: error instanceof Error ? error.message : 'Sync failed.' },
      });
    }
    return json({ error: error instanceof Error ? error.message : 'Sync failed.' }, 400);
  }
});
