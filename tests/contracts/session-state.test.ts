// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createSession, discardSession, inspectSession, sessionView, submitSession } from '../../src/domain/session';
import { oneAnswer, savedCorrect, savedSession, sessionInput, submission, unwrap } from './session-fixtures';

describe('D-05 v2 / D-10 v1 minimal session state', () => {
  it('creates only snapshot, attempts and discard marker with canonical matcher defaults', () => {
    expect(createSession(sessionInput(), () => 100)).toEqual({ ok: true, value: savedSession() });
    const input = sessionInput(); const record = unwrap(createSession(input, () => 100));
    input.items[0]!.prompt = 'changed'; input.items[0]!.answer.answer = 'changed'; input.items.pop();
    expect(record).toEqual(savedSession());
  });
  it.each([1, 100])('accepts exactly %i occurrences without pedagogical session presets', count => {
    expect(unwrap(createSession(sessionInput(count), () => 0)).snapshot.items).toHaveLength(count);
  });
  it.each([0, 101])('rejects %i occurrences', count => {
    expect(createSession(sessionInput(count), () => 0)).toEqual({ ok: false, error: 'invalid-input' });
  });
  it.each(['', 'a b', 'é', 'a'.repeat(129)])('rejects invalid identity %j', sessionId => {
    expect(createSession(sessionInput(1, sessionId), () => 0).ok).toBe(false);
  });
  it('accepts 128 ASCII ID characters and repeated source content under unique occurrences', () => {
    expect(createSession(sessionInput(3, 'a'.repeat(128)), () => 0).ok).toBe(true);
    const input = sessionInput(); input.items[1]!.occurrenceId = 'item-1';
    expect(createSession(input, () => 0).ok).toBe(false);
  });
  it.each(['', ' \t\n', '\ud800', '\u0000', '\u200b', 'x'.repeat(4001)])('rejects malformed prompt %j', prompt => {
    const input = sessionInput(1); input.items[0]!.prompt = prompt;
    expect(createSession(input, () => 0).ok).toBe(false);
  });
  it.each(['x', 'x'.repeat(4000), '\tTest\r\n😀'])('accepts valid prompt boundary', prompt => {
    const input = sessionInput(1); input.items[0]!.prompt = prompt;
    expect(createSession(input, () => 0).ok).toBe(true);
  });
  it.each([
    { answer: '' }, { answer: 'x'.repeat(1001) }, { answer: '\ud800' },
    { answer: 'Haus', acceptedVariants: Array(21).fill('Haus') },
    { answer: 'Haus', strictEszett: 'yes' }, { answer: 'Haus', hidden: true }
  ])('rejects invalid answer definition before creation: %j', answer => {
    const input = sessionInput(1);
    expect(createSession({ ...input, items: [{ ...input.items[0], answer }] }, () => 0).ok).toBe(false);
  });
  it('rejects unknown fields at each input boundary and bad item metadata', () => {
    const input = sessionInput(1);
    for (const changed of [
      { ...input, revision: 0 }, { ...input, items: [{ ...input.items[0], extra: true }] },
      { ...input, items: [{ ...input.items[0], language: 'fr' }] },
      { ...input, items: [{ ...input.items[0], contentVersion: '' }] },
      { ...input, items: [{ ...input.items[0], contentId: 'bad id' }] }
    ]) expect(createSession(changed, () => 0).ok).toBe(false);
  });
  it('derives empty progress and current occurrence without reading a clock', () => {
    const record = savedSession(); const before = structuredClone(record);
    expect(sessionView(record)).toEqual({ status: 'active', currentOccurrenceId: 'item-1', lastActivityAt: 100,
      progress: { total: 3, answered: 0, correct: 0, incorrect: 0, unanswered: 3, accuracy: null } });
    expect(record).toEqual(before);
  });
  it('appends correct and incorrect outcomes immutably and derives completion on the last answer', () => {
    const original = savedSession(2); const before = structuredClone(original);
    const first = unwrap(submitSession(original, submission(), () => 101));
    expect(first).toEqual({ changed: true, answerResult: savedCorrect, record: oneAnswer(2) });
    expect(original).toEqual(before);
    const final = unwrap(submitSession(first.record, submission(2, 'wrong'), () => 102));
    expect(final.answerResult).toEqual({ status: 'incorrect' });
    expect(sessionView(final.record)).toEqual({ status: 'completed', currentOccurrenceId: null, lastActivityAt: 102,
      progress: { total: 2, answered: 2, correct: 1, incorrect: 1, unanswered: 0, accuracy: 0.5 } });
    expect(Object.keys(final.record).sort()).toEqual(['attempts', 'discardedAt', 'snapshot']);
  });
  it('keeps approved matcher feedback and exact raw answer', () => {
    const input = sessionInput(1); input.items[0]!.answer.answer = 'schön';
    const record = unwrap(createSession(input, () => 0));
    const result = unwrap(submitSession(record, submission(1, ' SCHOEN '), () => 1));
    expect(result.answerResult).toEqual({ status: 'correct', matchedAnswerIndex: 0, transliterationUsed: true, caseDifference: true });
    expect(result.record.attempts[0]).toMatchObject({ rawAnswer: ' SCHOEN ', evaluationVersion: 'de-v1' });
  });
  it.each(['', ' ', '\u0000', '\ud800', 'x'.repeat(1001), null, 7])('does not record invalid learner input %j', rawAnswer => {
    const record = savedSession(); const before = structuredClone(record);
    expect(submitSession(record, { ...submission(), rawAnswer }, () => 101)).toEqual({ ok: false, error: 'invalid-input' });
    expect(record).toEqual(before);
  });
  it.each([null, {}, { ...submission(), extra: true }, { ...submission(), attemptId: '' }])('rejects malformed command %j', command => {
    expect(submitSession(savedSession(), command, () => 0)).toEqual({ ok: false, error: 'invalid-input' });
  });
  it('rejects wrong occurrence and session identity without changing state', () => {
    const record = oneAnswer(); const before = structuredClone(record);
    expect(submitSession(record, submission(1, 'wrong', 'new-attempt'), () => 102)).toEqual({ ok: false, error: 'conflict' });
    expect(submitSession(record, submission(3), () => 102)).toEqual({ ok: false, error: 'conflict' });
    expect(submitSession(record, { ...submission(2), sessionId: 'other' }, () => 102)).toEqual({ ok: false, error: 'conflict' });
    expect(record).toEqual(before);
  });
  it.each(['active', 'completed', 'discarded'])('deduplicates a saved retry on %s without reading time', state => {
    const record = state === 'completed' ? oneAnswer(1) : state === 'discarded' ? { ...oneAnswer(), discardedAt: 90 } : oneAnswer();
    const clock = vi.fn(() => Number.NaN);
    expect(submitSession(record, submission(), clock)).toEqual({ ok: true, value: { record, changed: false, answerResult: savedCorrect } });
    expect(clock).not.toHaveBeenCalled();
    expect(submitSession(record, submission(1, 'haus'), clock)).toEqual({ ok: false, error: 'conflict' });
    expect(submitSession(record, submission(2, 'Haus', 'attempt-1'), clock)).toEqual({ ok: false, error: 'conflict' });
  });
  it('rejects new submissions to terminal sessions', () => {
    for (const record of [oneAnswer(1), { ...oneAnswer(), discardedAt: 0 }]) {
      expect(submitSession(record, submission(2), () => 100)).toEqual({ ok: false, error: 'invalid-state' });
    }
  });
  it('discards the current saved aggregate, retains attempts, and makes repeated discard a no-op', () => {
    const record = oneAnswer(); const before = structuredClone(record);
    const discarded = unwrap(discardSession(record, () => 0));
    expect(discarded).toEqual({ changed: true, record: { ...record, discardedAt: 0 } });
    expect(sessionView(discarded.record)).toEqual({ status: 'discarded', currentOccurrenceId: null, lastActivityAt: 0,
      progress: { total: 3, answered: 1, correct: 1, incorrect: 0, unanswered: 2, accuracy: 1 } });
    const clock = vi.fn(() => Number.NaN);
    expect(discardSession(discarded.record, clock)).toEqual({ ok: true, value: { changed: false, record: discarded.record } });
    expect(clock).not.toHaveBeenCalled(); expect(record).toEqual(before);
    expect(discardSession(oneAnswer(1), () => 100)).toEqual({ ok: false, error: 'invalid-state' });
  });
  it.each([0, 8640000000000000])('accepts exact timestamp boundary %s', timestamp => {
    expect(unwrap(createSession(sessionInput(1), () => timestamp)).snapshot.createdAt).toBe(timestamp);
    const answered = unwrap(submitSession(savedSession(), submission(), () => timestamp));
    expect(answered.record.attempts[0]?.timestamp).toBe(timestamp);
    expect(unwrap(discardSession(savedSession(), () => timestamp)).record.discardedAt).toBe(timestamp);
  });
  it.each([-1, 0.5, Number.NaN, Infinity, 8640000000000001])('rejects invalid time %s without mutation', timestamp => {
    expect(createSession(sessionInput(), () => timestamp)).toEqual({ ok: false, error: 'invalid-time' });
    expect(submitSession(savedSession(), submission(), () => timestamp)).toEqual({ ok: false, error: 'invalid-time' });
    expect(discardSession(savedSession(), () => timestamp)).toEqual({ ok: false, error: 'invalid-time' });
  });
  it('orders by sequence when clocks move backward and never expires on repeated reads', () => {
    const first = unwrap(submitSession(savedSession(), submission(), () => 90)).record;
    const second = unwrap(submitSession(first, submission(2, 'wrong'), () => 80)).record;
    const before = structuredClone(second);
    expect(second.attempts.map(a => a.timestamp)).toEqual([90, 80]);
    expect(sessionView(second).lastActivityAt).toBe(80);
    expect(sessionView(second).currentOccurrenceId).toBe('item-3');
    for (let i = 0; i < 10; i++) expect(inspectSession(second)).toEqual({ ok: true, value: before });
    expect(second).toEqual(before);
  });
  it('preserves invariants across seeded outcome/retry/discard sequences', () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 30 }), flags => {
      let record = savedSession(flags.length + 1);
      flags.forEach((correct, index) => {
        const before = structuredClone(record); const command = submission(index + 1, correct ? 'Haus' : 'wrong');
        const next = unwrap(submitSession(record, command, () => flags.length - index));
        expect(record).toEqual(before); record = next.record;
        expect(unwrap(submitSession(record, command, () => Number.NaN)).changed).toBe(false);
        expect(sessionView(record).progress.answered).toBe(index + 1);
      });
      const view = sessionView(record);
      expect(view.progress.correct).toBe(flags.filter(Boolean).length);
      expect(view.progress.incorrect).toBe(flags.filter(x => !x).length);
      const discarded = unwrap(discardSession(record, () => 0)).record;
      expect(discarded.attempts).toEqual(record.attempts);
      expect(sessionView(discarded).progress).toEqual(view.progress);
    }), { seed: 20261114, numRuns: 40 });
  });
});
