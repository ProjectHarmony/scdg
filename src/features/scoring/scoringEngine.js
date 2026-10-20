export const DEFAULT_SCORING_RULES = Object.freeze({
  targetScore: 4,
  finishPoints: Object.freeze({
    xtreme: 3,
    burst: 2,
    over: 2,
    spin: 1,
  }),
});

export function normalizeScoringRules(rules = {}) {
  const targetScore = Number(rules.targetScore ?? DEFAULT_SCORING_RULES.targetScore);
  const unsupportedFinish = Object.keys(rules.finishPoints || {})
    .find(finish => !(finish in DEFAULT_SCORING_RULES.finishPoints));
  if (unsupportedFinish) throw new Error(`Unknown finish type: ${unsupportedFinish}`);

  const finishPoints = {
    ...DEFAULT_SCORING_RULES.finishPoints,
    ...(rules.finishPoints || {}),
  };

  if (!Number.isFinite(targetScore) || targetScore <= 0) {
    throw new Error('Target score must be a positive number.');
  }

  for (const [finish, points] of Object.entries(finishPoints)) {
    if (!Number.isFinite(Number(points)) || Number(points) < 0) {
      throw new Error(`Points for ${finish} must be a non-negative number.`);
    }
    finishPoints[finish] = Number(points);
  }

  return { targetScore, finishPoints };
}

export function calculateMatchState(events, entryAId, entryBId, rules = {}) {
  const normalizedRules = normalizeScoringRules(rules);
  const scores = { [entryAId]: 0, [entryBId]: 0 };

  for (const event of events) {
    if (event.voided) continue;
    if (!(event.scoringEntryId in scores)) {
      throw new Error('Scoring event does not belong to this match.');
    }

    const configuredPoints = normalizedRules.finishPoints[event.finishType];
    if (configuredPoints === undefined) {
      throw new Error(`Unknown finish type: ${event.finishType}`);
    }

    scores[event.scoringEntryId] += event.points ?? configuredPoints;
  }

  const winnerId = [entryAId, entryBId].find(id => scores[id] >= normalizedRules.targetScore) || null;

  return {
    scoreA: scores[entryAId],
    scoreB: scores[entryBId],
    winnerId,
    status: winnerId ? 'complete' : events.some(event => !event.voided) ? 'live' : 'pending',
  };
}

export function addScoringEvent(events, event, match, rules = {}) {
  const current = calculateMatchState(events, match.entryAId, match.entryBId, rules);
  if (current.status === 'complete') throw new Error('Match is already complete.');

  const normalizedRules = normalizeScoringRules(rules);
  const finishType = event.finishType;
  if (!(finishType in normalizedRules.finishPoints)) {
    throw new Error(`Unknown finish type: ${finishType}`);
  }
  if (![match.entryAId, match.entryBId].includes(event.scoringEntryId)) {
    throw new Error('Scoring player does not belong to this match.');
  }

  return [
    ...events,
    {
      ...event,
      scoringEntryId: event.scoringEntryId,
      points: normalizedRules.finishPoints[finishType],
      sequenceNo: events.length + 1,
      voided: false,
    },
  ];
}

export function undoLastEvent(events) {
  const index = events.findLastIndex(event => !event.voided);
  if (index < 0) throw new Error('No scoring event to undo.');

  return events.map((event, eventIndex) => (
    eventIndex === index ? { ...event, voided: true } : event
  ));
}
