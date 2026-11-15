import type { Result, SessionRecord } from '../../src/domain/session-types';

export function sessionInput(count = 3, sessionId = 'session-1') {
  return { sessionId, items: Array.from({ length: count }, (_, index) => ({
    occurrenceId: `item-${index + 1}`, contentId: 'synthetic-example', contentVersion: 'v1',
    language: 'de' as const, prompt: 'Synthetic test prompt', answer: { answer: 'Haus' }
  })) };
}
export function savedSession(count = 3): SessionRecord {
  const input = sessionInput(count);
  return { snapshot: { sessionId: input.sessionId, schemaVersion: 1, createdAt: 100,
    items: input.items.map(item => ({ ...item, answer: { ...item.answer, acceptedVariants: [], strictEszett: false, testsCapitalization: false } }))
  }, attempts: [], discardedAt: null };
}
export function submission(index = 1, rawAnswer = 'Haus', attemptId = `attempt-${index}`) {
  return { sessionId: 'session-1', occurrenceId: `item-${index}`, attemptId, rawAnswer };
}
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Expected successful behavior; received ${result.error}`);
  return result.value;
}
export const savedCorrect = { status: 'correct' as const, matchedAnswerIndex: 0, transliterationUsed: false, caseDifference: false };
export function oneAnswer(count = 3): SessionRecord {
  return { ...savedSession(count), attempts: [{ attemptId: 'attempt-1', occurrenceId: 'item-1', rawAnswer: 'Haus', result: savedCorrect, timestamp: 101, evaluationVersion: 'de-v1' }] };
}
