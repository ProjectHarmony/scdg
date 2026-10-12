import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, LoaderCircle, RefreshCw, RotateCcw, Swords, Trophy, Undo2 } from 'lucide-react';
import { m } from 'framer-motion';
import {
  DEFAULT_SCORING_RULES,
  addScoringEvent,
  calculateMatchState,
  undoLastEvent,
} from '../features/scoring/scoringEngine';
import {
  loadJudgeAssignment,
  recordLiveScoringEvent,
  syncChallongeMatch,
  undoLiveScoringEvent,
} from '../features/scoring/scoringApi';
import { supabase } from '../lib/supabase';

const finishOptions = [
  ['xtreme', 'Xtreme', 3],
  ['burst', 'Burst', 2],
  ['over', 'Over', 2],
  ['spin', 'Spin', 1],
];

const demoMatches = [
  { id: 'demo-1', round: 1, tableNo: '01', targetScore: 4, entryA: { id: 'entry-a', displayName: 'Player Alpha' }, entryB: { id: 'entry-b', displayName: 'Player Bravo' } },
  { id: 'demo-2', round: 1, tableNo: '02', targetScore: 4, entryA: { id: 'entry-c', displayName: 'Player Charlie' }, entryB: { id: 'entry-d', displayName: 'Player Delta' } },
  { id: 'demo-3', round: 1, tableNo: '03', targetScore: 4, entryA: { id: 'entry-e', displayName: 'Player Echo' }, entryB: { id: 'entry-f', displayName: 'Player Foxtrot' } },
];

const enterMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

function calculateDemoState(match, events) {
  return calculateMatchState(
    events,
    match.entryA.id,
    match.entryB.id,
    { ...DEFAULT_SCORING_RULES, targetScore: match.targetScore },
  );
}

function getMatchState(match, events, demo) {
  return demo ? calculateDemoState(match, events) : match.persistedState;
}

function JudgeState({ icon: Icon = AlertCircle, title, message, action, onExit }) {
  return (
    <main className="judge-page judge-state-page">
      <section className="judge-state-card">
        <Icon size={28} />
        <h1>{title}</h1>
        <p>{message}</p>
        <div>
          {action}
          <button className="judge-action-button" onClick={onExit}>Back to website</button>
        </div>
      </section>
    </main>
  );
}

function ScoringConsole({
  badge,
  busy,
  demo,
  error,
  eventsByMatch,
  matches,
  onExit,
  onRecord,
  onReset,
  onSync,
  onUndo,
  selectedId,
  setSelectedId,
}) {
  const [undoOpen, setUndoOpen] = useState(false);
  const selectedMatch = matches.find(match => match.id === selectedId) || matches[0];
  const events = eventsByMatch[selectedMatch.id] || [];
  const matchState = useMemo(
    () => getMatchState(selectedMatch, events, demo),
    [demo, events, selectedMatch],
  );
  const activeEventCount = events.filter(event => !event.voided).length;

  async function confirmUndo() {
    const succeeded = await onUndo(selectedMatch.id);
    if (succeeded !== false) {
      setUndoOpen(false);
    }
  }

  return (
    <main className="judge-page">
      <header className="judge-topbar">
        <button className="judge-icon-button" onClick={onExit} aria-label="Back to website" title="Back to website">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="judge-kicker">S-CDG Live Scoring</span>
          <h1>Judge Console</h1>
        </div>
        <span className="judge-demo-badge">{badge}</span>
      </header>

      {error && <div className="judge-error" role="alert"><AlertCircle size={18} /> {error}</div>}

      <div className="judge-layout">
        <aside className="judge-queue" aria-label="Assigned matches">
          <div className="judge-panel-heading">
            <div>
              <span>Judge queue</span>
              <h2>Assigned Matches</h2>
            </div>
            <Swords size={20} />
          </div>
          <div className="judge-match-list">
            {matches.map(match => {
              const state = getMatchState(match, eventsByMatch[match.id] || [], demo);
              return (
                <button
                  className={`judge-match-item ${selectedMatch.id === match.id ? 'active' : ''}`}
                  key={match.id}
                  onClick={() => {
                    setSelectedId(match.id);
                    setUndoOpen(false);
                  }}
                >
                  <span>Round {match.round} · Table {match.tableNo}</span>
                  <strong>{match.entryA.displayName} vs {match.entryB.displayName}</strong>
                  <small className={`judge-state ${state.status}`}>{state.status.replace('_', ' ')}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <m.section className="judge-workspace" key={selectedMatch.id} {...enterMotion}>
          <div className="judge-match-meta">
            <div>
              <span>Round {selectedMatch.round}</span>
              <strong>Table {selectedMatch.tableNo}</strong>
            </div>
            <div className={`judge-state ${matchState.status}`}>{matchState.status.replace('_', ' ')}</div>
          </div>

          <div className="judge-scoreboard" aria-live="polite">
            <div>
              <span>Player A</span>
              <strong>{selectedMatch.entryA.displayName}</strong>
            </div>
            <div className="judge-score">
              <b>{matchState.scoreA}</b>
              <span>First to {selectedMatch.targetScore}</span>
              <b>{matchState.scoreB}</b>
            </div>
            <div>
              <span>Player B</span>
              <strong>{selectedMatch.entryB.displayName}</strong>
            </div>
          </div>

          {matchState.winnerId && (
            <m.div className="judge-winner" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <Trophy size={22} />
              <div>
                <span>Match complete</span>
                <strong>
                  {matchState.winnerId === selectedMatch.entryA.id
                    ? selectedMatch.entryA.displayName
                    : selectedMatch.entryB.displayName} wins
                </strong>
              </div>
            </m.div>
          )}

          <div className="judge-controls">
            {[selectedMatch.entryA, selectedMatch.entryB].map((entry, playerIndex) => (
              <div className={`judge-player-controls player-${playerIndex + 1}`} key={entry.id}>
                <h3>{entry.displayName}</h3>
                <div className="judge-finish-grid">
                  {finishOptions.map(([id, label, points]) => (
                    <button
                      className={`judge-finish-button ${id}`}
                      disabled={busy || Boolean(matchState.winnerId)}
                      key={id}
                      onClick={() => onRecord(selectedMatch.id, id, entry.id)}
                    >
                      <strong>{label}</strong>
                      <span>+{points}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="judge-actions">
            <button
              className="judge-action-button"
              disabled={busy || !activeEventCount || matchState.status === 'synced'}
              onClick={() => setUndoOpen(true)}
            >
              {busy ? <LoaderCircle className="judge-spinner" size={17} /> : <Undo2 size={17} />} Undo
            </button>
            {!demo && ['complete', 'sync_failed'].includes(matchState.status) && (
              <button
                className="judge-action-button"
                disabled={busy}
                onClick={() => onSync(selectedMatch.id)}
              >
                {busy ? <LoaderCircle className="judge-spinner" size={17} /> : <RefreshCw size={17} />}
                {matchState.status === 'sync_failed' ? 'Retry Challonge' : 'Sync Challonge'}
              </button>
            )}
            {demo && (
              <button className="judge-icon-button" onClick={() => onReset(selectedMatch.id)} aria-label="Reset demo match" title="Reset demo match">
                <RotateCcw size={18} />
              </button>
            )}
          </div>

          <section className="judge-history">
            <div className="judge-panel-heading">
              <div>
                <span>Audit trail</span>
                <h2>Match History</h2>
              </div>
              <strong>{activeEventCount}</strong>
            </div>
            {!events.length ? (
              <p className="judge-empty">No scoring events yet.</p>
            ) : (
              <ol>
                {[...events].reverse().map(event => {
                  const scorer = event.scoringEntryId === selectedMatch.entryA.id
                    ? selectedMatch.entryA.displayName
                    : selectedMatch.entryB.displayName;
                  return (
                    <li className={event.voided ? 'voided' : ''} key={event.id}>
                      <span>#{event.sequenceNo}</span>
                      <div>
                        <strong>{scorer} - {event.finishType}</strong>
                        <small>{event.voided ? 'Voided' : `${event.points} point${event.points === 1 ? '' : 's'}`}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </m.section>
      </div>

      {undoOpen && (
        <div className="judge-dialog-backdrop" role="presentation">
          <div className="judge-dialog" role="dialog" aria-modal="true" aria-labelledby="undo-title">
            <h2 id="undo-title">Undo last event?</h2>
            <p>The score will return to its previous state and the event will remain visible as voided.</p>
            <div>
              <button className="judge-action-button" disabled={busy} onClick={() => setUndoOpen(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={confirmUndo}>Confirm Undo</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DemoJudgeScoring({ onExit }) {
  const [selectedId, setSelectedId] = useState(demoMatches[0].id);
  const [eventsByMatch, setEventsByMatch] = useState({});

  function recordFinish(matchId, finishType, scoringEntryId) {
    const match = demoMatches.find(item => item.id === matchId);
    setEventsByMatch(current => ({
      ...current,
      [matchId]: addScoringEvent(
        current[matchId] || [],
        { id: crypto.randomUUID(), finishType, scoringEntryId },
        { entryAId: match.entryA.id, entryBId: match.entryB.id },
        { targetScore: match.targetScore },
      ),
    }));
  }

  function undo(matchId) {
    setEventsByMatch(current => ({
      ...current,
      [matchId]: undoLastEvent(current[matchId] || []),
    }));
  }

  return (
    <ScoringConsole
      badge="Demo"
      demo
      eventsByMatch={eventsByMatch}
      matches={demoMatches}
      onExit={onExit}
      onRecord={recordFinish}
      onReset={matchId => setEventsByMatch(current => ({ ...current, [matchId]: [] }))}
      onUndo={undo}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
    />
  );
}

function LiveJudgeScoring({ session, onExit }) {
  const [matches, setMatches] = useState([]);
  const [eventsByMatch, setEventsByMatch] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (showLoading = false) => {
    if (!session?.user?.id) return;
    if (showLoading) setLoading(true);
    try {
      const data = await loadJudgeAssignment(session.user.id);
      setMatches(data.matches);
      setEventsByMatch(data.eventsByMatch);
      setSelectedId(current => data.matches.some(match => match.id === current) ? current : data.matches[0]?.id || '');
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Assigned matches could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return undefined;
    }

    refresh(true);
    const channel = supabase
      .channel(`judge-scoring-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scoring_matches' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scoring_match_events' }, () => refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh, session?.user?.id]);

  async function runMutation(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (mutationError) {
      setError(mutationError.message || 'The score could not be updated.');
      return false;
    } finally {
      await refresh();
      setBusy(false);
    }
    return true;
  }

  if (!session) {
    return (
      <JudgeState
        title="Judge access required"
        message="Sign in with an assigned S-CDG account before opening the live scoring console."
        onExit={onExit}
      />
    );
  }

  if (loading) {
    return <JudgeState icon={LoaderCircle} title="Loading assignment" message="Getting the latest matches and scores." onExit={onExit} />;
  }

  if (!matches.length) {
    return (
      <JudgeState
        title={error ? 'Could not load matches' : 'No matches assigned'}
        message={error || 'Your account is ready, but there are no pending matches assigned to you yet.'}
        action={<button className="btn-primary" onClick={() => refresh(true)}>Refresh</button>}
        onExit={onExit}
      />
    );
  }

  return (
    <ScoringConsole
      badge="Live"
      busy={busy}
      error={error}
      eventsByMatch={eventsByMatch}
      matches={matches}
      onExit={onExit}
      onRecord={(matchId, finishType, scoringEntryId) => runMutation(async () => {
        const updatedMatch = await recordLiveScoringEvent(matchId, finishType, scoringEntryId);
        if (updatedMatch?.status === 'complete') await syncChallongeMatch(matchId);
      })}
      onSync={matchId => runMutation(() => syncChallongeMatch(matchId))}
      onUndo={matchId => runMutation(() => undoLiveScoringEvent(matchId))}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
    />
  );
}

export function JudgeScoring({ demo = false, session, onExit }) {
  return demo
    ? <DemoJudgeScoring onExit={onExit} />
    : <LiveJudgeScoring session={session} onExit={onExit} />;
}
