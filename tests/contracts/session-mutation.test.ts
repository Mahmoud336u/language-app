// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createSession, discardSession, inspectSession, sessionView, submitSession } from '../../src/domain/session';
import { oneAnswer, savedSession, sessionInput, submission, unwrap } from './session-fixtures';

describe('D-05/D-10 mutation counterexamples', () => {
  it.each([42, 'invalid', true, { snapshot: 42 }, { snapshot: 'invalid' }])('rejects malformed persisted objects without throwing: %j', input => {
    expect(inspectSession(input)).toEqual({ ok: false, error: 'corrupt-data' });
  });

  it('accepts short explicit variants and rejects variants beyond the approved bound', () => {
    const input = sessionInput(1);
    const withVariant = (variant: string) => ({ ...input,
      items: input.items.map(item => ({ ...item, answer: { answer: 'Haus', acceptedVariants: [variant] } })) });
    expect(createSession(withVariant('Gebäude'), () => 100).ok).toBe(true);
    expect(createSession(withVariant('a'.repeat(1000)), () => 100).ok).toBe(true);
    expect(createSession(withVariant('a'.repeat(1001)), () => 100)).toEqual({ ok: false, error: 'invalid-input' });
  });

  it('rejects repeated attempt IDs even when occurrence order is valid', () => {
    const first = unwrap(submitSession(savedSession(), submission(), () => 100)).record;
    const second = unwrap(submitSession(first, submission(2), () => 101)).record;
    expect(inspectSession({ ...second,
      attempts: second.attempts.map(attempt => ({ ...attempt, attemptId: 'reused-id' }))
    })).toEqual({ ok: false, error: 'corrupt-data' });
  });

  it('uses the last sequence entry after three answers even if time moves backward', () => {
    let record = savedSession(4);
    for (const [index, time] of [900, 800, 700].entries()) {
      record = unwrap(submitSession(record, submission(index + 1), () => time)).record;
    }
    expect(sessionView(record)).toEqual({ status: 'active', currentOccurrenceId: 'item-4', lastActivityAt: 700,
      progress: { total: 4, answered: 3, correct: 3, incorrect: 0, unanswered: 1, accuracy: 1 } });
  });

  it('rejects corrupt records before submission without consulting the clock', () => {
    const clock = vi.fn(() => 102);
    const record = { ...oneAnswer(), discardedAt: -1 };
    expect(submitSession(record, submission(2), clock)).toEqual({ ok: false, error: 'corrupt-data' });
    expect(clock).not.toHaveBeenCalled();
    expect(record).toEqual({ ...oneAnswer(), discardedAt: -1 });
  });

  it('rejects corrupt records before discard without consulting the clock', () => {
    const clock = vi.fn(() => 102);
    const record = { ...oneAnswer(), discardedAt: -1 };
    expect(discardSession(record, clock)).toEqual({ ok: false, error: 'corrupt-data' });
    expect(clock).not.toHaveBeenCalled();
    expect(record).toEqual({ ...oneAnswer(), discardedAt: -1 });
  });
});
