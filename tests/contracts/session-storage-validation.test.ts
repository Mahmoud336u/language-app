// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { inspectSession } from '../../src/domain/session';
import { oneAnswer, savedSession } from './session-fixtures';

describe('D-10 minimal persisted session validation', () => {
  it('accepts and detaches valid records without deriving or storing duplicate state', () => {
    const record = oneAnswer(); const result = inspectSession(record);
    expect(result).toEqual({ ok: true, value: record });
    if (!result.ok) throw new Error('Expected valid record');
    expect(result.value).not.toBe(record); expect(result.value.snapshot).not.toBe(record.snapshot);
  });
  it('does not regrade historical outcomes', () => {
    const record = oneAnswer();
    expect(inspectSession({ ...record, attempts: [{ ...record.attempts[0], rawAnswer: 'different historical answer' }] }).ok).toBe(true);
  });
  it('accepts non-monotonic timestamps and rejects a future version distinctly', () => {
    const record = oneAnswer();
    expect(inspectSession({ ...record, discardedAt: 0 }).ok).toBe(true);
    expect(inspectSession({ ...record, snapshot: { ...record.snapshot, schemaVersion: 2 } })).toEqual({ ok: false, error: 'unsupported-version' });
  });
  it.each([null, [], {}, { snapshot: null }, { ...savedSession(), revision: 0 }, { ...savedSession(), status: 'active' }])('rejects malformed or redundant persisted state', record => {
    expect(inspectSession(record)).toEqual({ ok: false, error: 'corrupt-data' });
  });
  it('rejects corrupt minimal record fields without mutating them', () => {
    const record = oneAnswer(); const attempt = record.attempts[0]; const item = record.snapshot.items[0];
    const invalid = [
      { ...record, discardedAt: -1 },
      { ...oneAnswer(1), discardedAt: 102 },
      { ...record, snapshot: { ...record.snapshot, schemaVersion: 0 } },
      { ...record, snapshot: { ...record.snapshot, createdAt: 0.1 } },
      { ...record, snapshot: { ...record.snapshot, extra: true } },
      { ...record, snapshot: { ...record.snapshot, items: [item, item] } },
      { ...record, snapshot: { ...record.snapshot, items: [{ ...item, answer: { answer: 'Haus' } }] } },
      { ...record, attempts: [attempt, attempt] },
      { ...record, attempts: [{ ...attempt, occurrenceId: 'item-2' }] },
      { ...record, attempts: [{ ...attempt, attemptId: '' }] },
      { ...record, attempts: [{ ...attempt, rawAnswer: '\u0000' }] },
      { ...record, attempts: [{ ...attempt, timestamp: Infinity }] },
      { ...record, attempts: [{ ...attempt, evaluationVersion: 'de-v2' }] },
      { ...record, attempts: [{ ...attempt, result: { status: 'invalid-input' } }] },
      { ...record, attempts: [{ ...attempt, result: { status: 'incorrect', matchedAnswerIndex: 0 } }] },
      { ...record, attempts: [{ ...attempt, result: { status: 'correct', matchedAnswerIndex: 1, transliterationUsed: false, caseDifference: false } }] },
      { ...record, attempts: [{ ...attempt, result: { status: 'correct', matchedAnswerIndex: -1, transliterationUsed: false, caseDifference: false } }] },
      { ...record, attempts: [{ ...attempt, result: { status: 'correct', matchedAnswerIndex: 0, transliterationUsed: 'yes', caseDifference: false } }] },
      { ...record, attempts: [{ ...attempt, extra: true }] }
    ];
    for (const value of invalid) {
      const before = structuredClone(value);
      expect(inspectSession(value)).toEqual({ ok: false, error: 'corrupt-data' });
      expect(value).toEqual(before);
    }
  });
});
