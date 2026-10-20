import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCORING_RULES,
  addScoringEvent,
  calculateMatchState,
  normalizeScoringRules,
  undoLastEvent,
} from './scoringEngine';

const match = { entryAId: 'a', entryBId: 'b' };

function score(events, finishType, scoringEntryId) {
  return addScoringEvent(events, { finishType, scoringEntryId }, match);
}

describe('scoring engine', () => {
  it('uses the default 3/2/2/1 scoring rules', () => {
    expect(DEFAULT_SCORING_RULES.finishPoints).toEqual({
      xtreme: 3,
      burst: 2,
      over: 2,
      spin: 1,
    });
  });

  it('locks the match when a player reaches the target', () => {
    let events = score([], 'xtreme', 'a');
    events = score(events, 'spin', 'a');

    expect(calculateMatchState(events, 'a', 'b')).toEqual({
      scoreA: 4,
      scoreB: 0,
      winnerId: 'a',
      status: 'complete',
    });
    expect(() => score(events, 'spin', 'b')).toThrow('Match is already complete.');
  });

  it('does not treat a relaunch as a scoring event', () => {
    expect(() => score([], 'draw', null)).toThrow('Unknown finish type: draw');
  });

  it('voids only the latest active event during undo', () => {
    let events = score([], 'burst', 'a');
    events = score(events, 'spin', 'b');
    events = undoLastEvent(events);

    expect(calculateMatchState(events, 'a', 'b')).toMatchObject({ scoreA: 2, scoreB: 0 });
    expect(events[1].voided).toBe(true);
  });

  it('supports tournament-specific scoring and target values', () => {
    const rules = normalizeScoringRules({
      targetScore: 7,
      finishPoints: { xtreme: 4 },
    });
    let events = addScoringEvent([], { finishType: 'xtreme', scoringEntryId: 'a' }, match, rules);
    events = addScoringEvent(events, { finishType: 'xtreme', scoringEntryId: 'a' }, match, rules);

    expect(calculateMatchState(events, 'a', 'b', rules)).toMatchObject({
      scoreA: 8,
      winnerId: 'a',
      status: 'complete',
    });
  });

  it('rejects invalid rules and players outside the match', () => {
    expect(() => normalizeScoringRules({ targetScore: 0 })).toThrow();
    expect(() => normalizeScoringRules({ finishPoints: { knockout: 5 } })).toThrow('Unknown finish type: knockout');
    expect(() => score([], 'spin', 'c')).toThrow('Scoring player does not belong to this match.');
  });
});
