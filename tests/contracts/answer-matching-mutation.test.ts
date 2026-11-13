// @vitest-environment node
import { expect, it } from 'vitest';
import { matchGermanAnswer } from '../../src/domain/answer-matching';

// Counterexample produced by mutation analysis: an implementation must never
// manufacture accepted variants or per-character spellings from unrelated text.
const unauthorizedAnswer = 'Stryker was here';

it.each([
  { answer: 'Haus' },
  { answer: 'x', acceptedVariants: [] },
  { answer: 'ß', acceptedVariants: [], strictEszett: true },
  { answer: 'ẞ', acceptedVariants: [], strictEszett: true, testsCapitalization: true }
])('rejects invented answers for %j', (definition) => {
  expect(matchGermanAnswer(definition, unauthorizedAnswer)).toEqual({ status: 'incorrect' });
});
