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

function normalizeTournamentReference(input: string, suppliedCommunityId = '') {
  const value = input.trim();
  if (!value) throw new Error('Enter a Challonge tournament URL, slug, or ID.');
  if (!/^https?:\/\//i.test(value)) {
    return { reference: value.replace(/^\/+|\/+$/g, ''), communityId: suppliedCommunityId.trim() };
  }

  const url = new URL(value);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts.at(-1);
  if (!slug) throw new Error('The Challonge URL does not contain a tournament slug.');

  const communityIndex = parts.findIndex(part => part === 'communities');
  const pathCommunity = communityIndex >= 0 ? parts[communityIndex + 1] || '' : '';
  const hostnameCommunity = url.hostname.endsWith('.challonge.com')
    && !['www.challonge.com', 'api.challonge.com'].includes(url.hostname)
    ? url.hostname.slice(0, -'.challonge.com'.length)
    : '';
  return { reference: slug, communityId: suppliedCommunityId.trim() || pathCommunity || hostnameCommunity };
}

function scopedPath(path: string, communityId: string) {
  if (!communityId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}community_id=${encodeURIComponent(communityId)}`;
}

async function fetchCollection(path: string, accessToken: string) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const payload = await challongeRequest(`${path}${separator}page=${page}&per_page=100`, accessToken);
    const pageRows = payload?.data || [];
    rows.push(...pageRows);
    if (pageRows.length < 100) break;
  }
  return rows;
}

function parseAggregateScore(value?: string | null) {
  const match = String(value || '').match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('The Supabase Edge Function secrets are not configured.');
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required.' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session.' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await request.json();
    const normalized = normalizeTournamentReference(String(body.tournament || ''), String(body.communityId || ''));
    const tournamentReference = normalized.reference;
    const communityId = normalized.communityId;
    const encodedReference = encodeURIComponent(tournamentReference);
    const accessToken = await getAccessToken(admin, userData.user.id);

    const [tournamentPayload, participantPayload, matchPayload] = await Promise.all([
      challongeRequest(scopedPath(`/tournaments/${encodedReference}.json`, communityId), accessToken),
      fetchCollection(scopedPath(`/tournaments/${encodedReference}/participants.json`, communityId), accessToken),
      fetchCollection(scopedPath(`/tournaments/${encodedReference}/matches.json`, communityId), accessToken),
    ]);

    const tournament = { id: Number(tournamentPayload.data?.id), ...tournamentPayload.data?.attributes };
    const participants = participantPayload.map(participant => ({
      id: Number(participant.id),
      ...participant.attributes,
      removed: participant.attributes?.states?.active === false,
    }));
    const matches = matchPayload.map(match => ({
      id: Number(match.id),
      ...match.attributes,
      player1_id: Number(match.attributes?.relationships?.player1?.data?.id) || null,
      player2_id: Number(match.attributes?.relationships?.player2?.data?.id) || null,
      scores_csv: match.attributes?.scores,
    }));
    if (!tournament?.id) throw new Error('Challonge returned an invalid tournament.');
    if (tournament.tournament_type !== 'swiss') {
      throw new Error('Only Swiss tournaments are supported in this phase.');
    }

    const openRounds = matches.filter(match => match.state !== 'complete').map(match => Number(match.round) || 0);
    const allRounds = matches.map(match => Number(match.round) || 0);
    const currentRound = Math.max(1, ...(openRounds.length ? openRounds : allRounds));
    const tournamentStatus = ['complete', 'ended', 'awaiting_review'].includes(tournament.state)
      ? 'complete'
      : ['underway', 'in_progress'].includes(tournament.state) ? 'active' : 'draft';

    const { data: savedTournament, error: tournamentError } = await admin
      .from('scoring_tournaments')
      .upsert({
        owner_id: userData.user.id,
        challonge_tournament_id: tournament.id,
        challonge_scope: communityId ? 'community' : 'user',
        challonge_community_id: communityId || null,
        name: tournament.name,
        current_round: currentRound,
        status: tournamentStatus,
        feature_enabled: true,
      }, { onConflict: 'owner_id,challonge_tournament_id' })
      .select('id')
      .single();
    if (tournamentError) throw tournamentError;

    await admin.from('scoring_memberships').upsert({
      tournament_id: savedTournament.id,
      user_id: userData.user.id,
      role: 'organizer',
    }, { onConflict: 'tournament_id,user_id' });

    const { data: stage, error: stageError } = await admin
      .from('scoring_stages')
      .upsert({
        tournament_id: savedTournament.id,
        stage_no: 1,
        type: 'swiss',
        target_score: 4,
        status: tournamentStatus === 'complete' ? 'complete' : 'active',
        challonge_tournament_id: tournament.id,
      }, { onConflict: 'tournament_id,stage_no' })
      .select('id,target_score')
      .single();
    if (stageError) throw stageError;

    const entryRows = participants.map(participant => ({
      tournament_id: savedTournament.id,
      challonge_participant_id: participant.id,
      display_name: participant.display_name || participant.name,
      seed: participant.seed || null,
      is_active: !participant.removed,
    }));
    const { data: entries, error: entryError } = entryRows.length
      ? await admin.from('scoring_entries').upsert(entryRows, {
        onConflict: 'tournament_id,challonge_participant_id',
      }).select('id,challonge_participant_id')
      : { data: [], error: null };
    if (entryError) throw entryError;
    const entryByChallongeId = new Map(entries.map(entry => [Number(entry.challonge_participant_id), entry.id]));

    const matchIds = matches.map(match => Number(match.id));
    const { data: existingMatches, error: existingError } = matchIds.length
      ? await admin.from('scoring_matches')
        .select('*')
        .eq('tournament_id', savedTournament.id)
        .in('challonge_match_id', matchIds)
      : { data: [], error: null };
    if (existingError) throw existingError;
    const existingByChallongeId = new Map(existingMatches.map(match => [Number(match.challonge_match_id), match]));

    const importedMatches = matches.flatMap((match, index) => {
      const entryAId = entryByChallongeId.get(Number(match.player1_id)) || null;
      const entryBId = entryByChallongeId.get(Number(match.player2_id)) || null;
      if (!entryAId && !entryBId) return [];

      const existing = existingByChallongeId.get(Number(match.id));
      const remoteReopened = existing
        && ['complete', 'synced', 'sync_failed'].includes(existing.status)
        && match.state !== 'complete';
      const preserveLocalScore = existing && existing.status !== 'pending' && !remoteReopened;
      const isBye = Boolean(entryAId) !== Boolean(entryBId);
      const [challongeScoreA, challongeScoreB] = parseAggregateScore(match.scores_csv);
      const importedWinner = entryByChallongeId.get(Number(match.winner_id)) || null;
      const winner = isBye ? entryAId || entryBId : importedWinner;
      const importedComplete = isBye || (match.state === 'complete' && winner);

      return [{
        tournament_id: savedTournament.id,
        stage_id: stage.id,
        challonge_match_id: match.id,
        round: Math.max(1, Number(match.round) || currentRound),
        table_no: existing?.table_no || String(index + 1).padStart(2, '0'),
        entry_a_id: entryAId,
        entry_b_id: entryBId,
        assigned_judge_id: existing?.assigned_judge_id || userData.user.id,
        is_bye: isBye,
        score_a: preserveLocalScore ? existing.score_a : isBye ? (entryAId ? stage.target_score : 0) : challongeScoreA,
        score_b: preserveLocalScore ? existing.score_b : isBye ? (entryBId ? stage.target_score : 0) : challongeScoreB,
        winner_entry_id: preserveLocalScore ? existing.winner_entry_id : winner,
        status: preserveLocalScore ? existing.status : importedComplete ? 'complete' : 'pending',
        ended_at: preserveLocalScore ? existing.ended_at : importedComplete ? new Date().toISOString() : null,
      }];
    });

    const { data: savedMatches, error: matchError } = importedMatches.length
      ? await admin.from('scoring_matches').upsert(importedMatches, {
        onConflict: 'tournament_id,challonge_match_id',
      }).select('id,is_bye,winner_entry_id')
      : { data: [], error: null };
    if (matchError) throw matchError;

    const reopenedMatchIds = matches.flatMap(match => {
      const existing = existingByChallongeId.get(Number(match.id));
      return existing
        && ['complete', 'synced', 'sync_failed'].includes(existing.status)
        && match.state !== 'complete'
        ? [existing.id]
        : [];
    });
    if (reopenedMatchIds.length) {
      const { error: voidError } = await admin.from('scoring_match_events').update({
        voided: true,
        voided_by: userData.user.id,
        voided_at: new Date().toISOString(),
        void_reason: 'Match reopened in Challonge',
      }).in('match_id', reopenedMatchIds).eq('voided', false);
      if (voidError) throw voidError;
    }

    const byeEvents = savedMatches.filter(match => match.is_bye).map(match => ({
      match_id: match.id,
      scoring_entry_id: match.winner_entry_id,
      finish_type: 'bye',
      points: stage.target_score,
      sequence_no: 1,
      idempotency_key: crypto.randomUUID(),
      created_by: userData.user.id,
    }));
    if (byeEvents.length) {
      const { error: byeError } = await admin.from('scoring_match_events').upsert(byeEvents, {
        onConflict: 'match_id,sequence_no',
        ignoreDuplicates: true,
      });
      if (byeError) throw byeError;
    }

    await admin.from('scoring_sync_log').insert({
      operation: 'challonge_import',
      request_payload: { tournament: tournamentReference, community_id: communityId || null },
      response_status: 200,
      response_body: { participants: entries.length, matches: savedMatches.length, current_round: currentRound },
    });

    return json({
      tournament: { id: savedTournament.id, name: tournament.name, currentRound },
      participants: entries.length,
      matches: savedMatches.length,
      byes: savedMatches.filter(match => match.is_bye).length,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Import failed.' }, 400);
  }
});
