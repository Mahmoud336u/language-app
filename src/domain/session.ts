import { matchGermanAnswer } from './answer-matching';
import { createSessionSchema, sessionRecordSchema, submissionSchema, timestampSchema } from './session-schema';
import type { Clock, Result, SessionMutation, SessionRecord, SessionView } from './session-types';

export function createSession(input: unknown, clock: Clock): Result<SessionRecord> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid-input' };
  const time = timestampSchema.safeParse(clock());
  if (!time.success) return { ok: false, error: 'invalid-time' };
  return { ok: true, value: { snapshot: { ...parsed.data, schemaVersion: 1, createdAt: time.data }, attempts: [], discardedAt: null } };
}

/** Validation detaches data and checks shape/order; historical answers are not regraded. */
export function inspectSession(input: unknown): Result<SessionRecord> {
  if (typeof input === 'object' && input !== null && 'snapshot' in input) {
    const snapshot = input.snapshot;
    if (typeof snapshot === 'object' && snapshot !== null && 'schemaVersion' in snapshot
      && typeof snapshot.schemaVersion === 'number' && Number.isInteger(snapshot.schemaVersion) && snapshot.schemaVersion > 1) {
      return { ok: false, error: 'unsupported-version' };
    }
  }
  const parsed = sessionRecordSchema.safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: 'corrupt-data' };
}

export function sessionView(record: SessionRecord): SessionView {
  const total = record.snapshot.items.length;
  const answered = record.attempts.length;
  const correct = record.attempts.filter(attempt => attempt.result.status === 'correct').length;
  const status = record.discardedAt !== null ? 'discarded' : answered === total ? 'completed' : 'active';
  const currentOccurrenceId = status === 'active' ? record.snapshot.items[answered]?.occurrenceId ?? null : null;
  const lastActivityAt = record.discardedAt ?? record.attempts.at(-1)?.timestamp ?? record.snapshot.createdAt;
  const progress = { total, answered, correct, incorrect: answered - correct, unanswered: total - answered,
    accuracy: answered === 0 ? null : correct / answered };
  return { status, currentOccurrenceId, lastActivityAt, progress };
}

export function submitSession(record: SessionRecord, command: unknown, clock: Clock): Result<SessionMutation> {
  const parsed = submissionSchema.safeParse(command);
  if (!parsed.success) return { ok: false, error: 'invalid-input' };
  const checked = inspectSession(record);
  if (!checked.ok) return checked;
  const current = checked.value;
  const input = parsed.data;
  if (input.sessionId !== current.snapshot.sessionId) return { ok: false, error: 'conflict' };
  // Deduplicate before terminal/current-item checks: the original request advanced state.
  const previous = current.attempts.find(attempt => attempt.attemptId === input.attemptId);
  if (previous) return previous.occurrenceId === input.occurrenceId && previous.rawAnswer === input.rawAnswer
    ? { ok: true, value: { record: current, changed: false, answerResult: previous.result } }
    : { ok: false, error: 'conflict' };
  if (sessionView(current).status !== 'active') return { ok: false, error: 'invalid-state' };
  const item = current.snapshot.items[current.attempts.length];
  if (!item || item.occurrenceId !== input.occurrenceId) return { ok: false, error: 'conflict' };
  const result = matchGermanAnswer(item.answer, input.rawAnswer);
  if (result.status === 'invalid-input' || result.status === 'invalid-exercise') return { ok: false, error: result.status };
  const time = timestampSchema.safeParse(clock());
  if (!time.success) return { ok: false, error: 'invalid-time' };
  const savedResult = result.status === 'correct' ? result : { status: 'incorrect' as const };
  const attempt = { attemptId: input.attemptId, occurrenceId: input.occurrenceId, rawAnswer: input.rawAnswer,
    result: savedResult, timestamp: time.data, evaluationVersion: 'de-v1' as const };
  return { ok: true, value: { changed: true, answerResult: savedResult,
    record: { ...current, attempts: [...current.attempts, attempt] } } };
}

export function discardSession(record: SessionRecord, clock: Clock): Result<SessionMutation> {
  const checked = inspectSession(record);
  if (!checked.ok) return checked;
  const current = checked.value;
  if (current.discardedAt !== null) return { ok: true, value: { record: current, changed: false } };
  if (sessionView(current).status === 'completed') return { ok: false, error: 'invalid-state' };
  const time = timestampSchema.safeParse(clock());
  if (!time.success) return { ok: false, error: 'invalid-time' };
  return { ok: true, value: { record: { ...current, discardedAt: time.data }, changed: true } };
}
