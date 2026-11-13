// @vitest-environment node
import { expect, it } from 'vitest';
import { matchGermanAnswer } from '../../src/domain/answer-matching';

it.each(['\t', '\r', '\n'])('does not repair unpaired surrogates by removing %j during validation', (separator) => {
  const malformed = '\ud83d' + separator + '\ude00';
  expect(matchGermanAnswer({ answer: 'Haus' }, malformed)).toEqual({ status: 'invalid-input' });
  expect(matchGermanAnswer({ answer: malformed }, 'Haus')).toEqual({ status: 'invalid-exercise' });
});
