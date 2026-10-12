import { supabase } from '../../lib/supabase';

function mapEvent(event) {
  return {
    id: event.id,
    matchId: event.match_id,
    scoringEntryId: event.scoring_entry_id,
    finishType: event.finish_type,
    points: event.points,
    sequenceNo: event.sequence_no,
    voided: event.voided,
  };
}

export async function loadJudgeAssignment(userId) {
  const { data: matchRows, error: matchError } = await supabase
    .from('scoring_matches')
    .select('*')
    .eq('assigned_judge_id', userId)
    .in('status', ['pending', 'live', 'complete', 'sync_failed'])
    .order('round', { ascending: true })
    .order('table_no', { ascending: true });

  if (matchError) throw matchError;
  if (!matchRows?.length) return { matches: [], eventsByMatch: {} };

  const entryIds = [...new Set(matchRows.flatMap(match => [match.entry_a_id, match.entry_b_id]).filter(Boolean))];
  const stageIds = [...new Set(matchRows.map(match => match.stage_id))];
  const matchIds = matchRows.map(match => match.id);

  const [entriesResult, stagesResult, eventsResult] = await Promise.all([
    supabase.from('scoring_entries').select('id, display_name').in('id', entryIds),
    supabase.from('scoring_stages').select('id, target_score').in('id', stageIds),
    supabase.from('scoring_match_events').select('*').in('match_id', matchIds).order('sequence_no'),
  ]);

  const firstError = entriesResult.error || stagesResult.error || eventsResult.error;
  if (firstError) throw firstError;

  const entries = new Map((entriesResult.data || []).map(entry => [entry.id, entry]));
  const stages = new Map((stagesResult.data || []).map(stage => [stage.id, stage]));
  const eventsByMatch = {};
  for (const event of eventsResult.data || []) {
    if (!eventsByMatch[event.match_id]) eventsByMatch[event.match_id] = [];
    eventsByMatch[event.match_id].push(mapEvent(event));
  }

  return {
    matches: matchRows.map(match => ({
      id: match.id,
      round: match.round,
      tableNo: match.table_no || '-',
      targetScore: stages.get(match.stage_id)?.target_score || 4,
      entryA: {
        id: match.entry_a_id,
        displayName: entries.get(match.entry_a_id)?.display_name || 'Player A',
      },
      entryB: {
        id: match.entry_b_id,
        displayName: entries.get(match.entry_b_id)?.display_name || 'Player B',
      },
      persistedState: {
        scoreA: match.score_a,
        scoreB: match.score_b,
        winnerId: match.winner_entry_id,
        status: match.status,
      },
    })),
    eventsByMatch,
  };
}

export async function recordLiveScoringEvent(matchId, finishType, scoringEntryId) {
  const { data, error } = await supabase.rpc('record_scoring_event', {
    p_match_id: matchId,
    p_finish_type: finishType,
    p_scoring_entry_id: scoringEntryId,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) throw error;
  return data;
}

export async function undoLiveScoringEvent(matchId) {
  const { error } = await supabase.rpc('undo_last_scoring_event', {
    p_match_id: matchId,
    p_reason: 'Judge correction',
  });
  if (error) throw error;
}

export async function syncChallongeMatch(matchId) {
  const { data, error } = await supabase.functions.invoke('challonge-sync-match', {
    body: { matchId },
  });
  if (error) {
    let detail = '';
    try {
      detail = (await error.context?.json())?.error || '';
    } catch {
      // Fall back to the SDK error when the response has no JSON body.
    }
    throw new Error(detail || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
