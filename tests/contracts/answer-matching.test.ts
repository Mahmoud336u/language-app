// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGermanAnswer } from '../../src/domain/answer-matching';

const correct = (matchedAnswerIndex = 0, transliterationUsed = false, caseDifference = false) => ({
  status: 'correct', matchedAnswerIndex, transliterationUsed, caseDifference
});

describe('D-03/D-04 approved typed-answer contract v1', () => {
  it('accepts the canonical answer and identifies an explicit variant by original index', () => {
    const exercise = { answer: 'Hallo', acceptedVariants: ['Guten Tag', 'Guten Morgen'] };
    expect(matchGermanAnswer(exercise, 'Hallo')).toEqual(correct());
    expect(matchGermanAnswer(exercise, 'Guten Morgen')).toEqual(correct(2));
    expect(matchGermanAnswer(exercise, 'Hi')).toEqual({ status: 'incorrect' });
  });

  it('allows an empty variant list and omitted or explicitly undefined optional fields', () => {
    expect(matchGermanAnswer({ answer: 'Haus', acceptedVariants: [] }, 'haus')).toEqual(correct(0, false, true));
    expect(matchGermanAnswer({ answer: 'schön', acceptedVariants: undefined, strictEszett: undefined, testsCapitalization: undefined }, 'schoen')).toEqual(correct(0, true));
  });

  it.each([
    ['schön', 'scho\u0308n'], ['scho\u0308n', 'schön'], ['é', 'e\u0301'],
    ['Guten Tag', ' \tGuten\r\n\u00a0 Tag\t '], ['\tGuten   Tag\r', 'Guten Tag'],
    ['😀', '😀']
  ])('accepts only approved canonical equivalences: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer }, input)).toEqual(correct());
  });

  it.each([
    ['schön', 'schoen'], ['grün', 'gruen'], ['Mädchen', 'Maedchen'],
    ['Straße', 'Strasse'], ['Süß', 'Suess'], ['Süß', 'Süss'], ['Süß', 'Sueß'],
    ['größer', 'groesser'], ['größer', 'grösser'],
    ['ÄÖÜẞ', 'AeOeUeSS'], ['ÄÖÜẞ', 'AEOEUESS'],
    ['a.*(ö)[ß]?', 'a.*(oe)[ss]?']
  ])('accepts directional full or mixed transliteration: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer }, input)).toEqual(correct(0, true));
  });

  it.each([
    ['schön', 'schon'], ['grün', 'grun'], ['Mädchen', 'Madchen'],
    ['Masse', 'Maße'], ['schoen', 'schön'], ['gruen', 'grün'], ['ae', 'ä'],
    ['Haus', 'Hаus'], ['Haus', 'Ha us'], ['Guten Tag', 'Tag Guten'],
    ['Hallo!', 'Hallo'], ['Hallo', 'Hallo!'], ['A', 'Ａ'], ['ff', 'ﬀ'],
    ['a b', 'a\u2003b'], ['a', '\u2003a'], ['é', 'e'],
    ['a.*(ö)[ß]?', 'anything'], ['ßs', 'ss'], ['a', 'aa'], ['aa', 'a']
  ])('rejects unapproved spelling, order, punctuation, or normalization: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer }, input)).toEqual({ status: 'incorrect' });
  });

  it('allows punctuation differences only when they are an explicit variant', () => {
    expect(matchGermanAnswer({ answer: 'Hallo!', acceptedVariants: ['Hallo'] }, 'Hallo')).toEqual(correct(1));
  });

  it.each([
    ['Maße', 'Masse'], ['Straße', 'STRASSE'], ['ẞ', 'SS'], ['Süß', 'Suess']
  ])('enforces strict ß independently of ordinary case: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer, strictEszett: true }, input)).toEqual({ status: 'incorrect' });
  });

  it('preserves strict ß while allowing umlaut replacement and letter-case matching', () => {
    expect(matchGermanAnswer({ answer: 'Süß', strictEszett: true }, 'Sueß')).toEqual(correct(0, true));
    expect(matchGermanAnswer({ answer: 'Maße', strictEszett: true }, 'MAẞE')).toEqual(correct(0, false, true));
    expect(matchGermanAnswer({ answer: 'Maße', strictEszett: false }, 'Masse')).toEqual(correct(0, true));
    expect(matchGermanAnswer({ answer: 'Maße', strictEszett: true, acceptedVariants: ['Masse'] }, 'Masse')).toEqual(correct(1));
  });

  it.each([
    ['Haus', 'haus'], ['haus', 'HAUS'], ['Maße', 'MAẞE'], ['ΟΣ', 'ος'], ['İ', 'i\u0307']
  ])('uses German-locale whole-string lowercase without losing ß: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer }, input)).toEqual(correct(0, false, true));
  });

  it.each([
    ['Äpfel', 'Aepfel'], ['Äpfel', 'AEpfel'], ['Öl', 'Oel'], ['Öl', 'OEl'],
    ['Übung', 'Uebung'], ['Übung', 'UEbung'], ['äöüß', 'aeoeuess'], ['ẞ', 'SS']
  ])('preserves approved transliteration case in strict mode: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer, testsCapitalization: true }, input)).toEqual(correct(0, true));
  });

  it.each([
    ['Haus', 'haus'], ['Äpfel', 'aepfel'], ['Äpfel', 'AEPFEL'],
    ['ä', 'Ae'], ['ö', 'OE'], ['ü', 'UE'], ['ß', 'SS'], ['ẞ', 'ss'], ['ẞ', 'ß']
  ])('rejects case changes when capitalization is tested: %s / %s', (answer, input) => {
    expect(matchGermanAnswer({ answer, testsCapitalization: true }, input)).toEqual({ status: 'incorrect' });
  });

  it('accepts exact strict-case spelling and still blocks strict uppercase ß transliteration', () => {
    expect(matchGermanAnswer({ answer: 'Äpfel', testsCapitalization: true }, 'Äpfel')).toEqual(correct());
    expect(matchGermanAnswer({ answer: 'ẞ', strictEszett: true, testsCapitalization: true }, 'SS')).toEqual({ status: 'incorrect' });
  });

  it('reports case difference and transliteration independently', () => {
    expect(matchGermanAnswer({ answer: 'schön' }, 'SCHOEN')).toEqual(correct(0, true, true));
    expect(matchGermanAnswer({ answer: 'Ü' }, 'UE')).toEqual(correct(0, true, false));
    expect(matchGermanAnswer({ answer: 'ü' }, 'UE')).toEqual(correct(0, true, true));
  });

  it('prefers exact variants over canonical case-only or transliteration matches', () => {
    expect(matchGermanAnswer({ answer: 'Haus', acceptedVariants: ['haus'] }, 'haus')).toEqual(correct(1));
    expect(matchGermanAnswer({ answer: 'schön', acceptedVariants: ['schoen'] }, 'schoen')).toEqual(correct(1));
  });

  it('prefers case-only variants over canonical transliteration matches', () => {
    expect(matchGermanAnswer({ answer: 'schön', acceptedVariants: ['SCHOEN'] }, 'schoen')).toEqual(correct(1, false, true));
  });

  it('preserves canonical then supplied variant order within each match class', () => {
    expect(matchGermanAnswer({ answer: 'Haus', acceptedVariants: ['HAUS'] }, 'hAuS')).toEqual(correct(0, false, true));
    expect(matchGermanAnswer({ answer: 'Süß', acceptedVariants: ['süß'] }, 'suess')).toEqual(correct(0, true, true));
    expect(matchGermanAnswer({ answer: 'anderes', acceptedVariants: ['Schön', 'schön'] }, 'SCHOEN')).toEqual(correct(1, true, true));
  });

  it('does not duplicate results or renumber original references after normalized duplicates', () => {
    expect(matchGermanAnswer({ answer: 'schön', acceptedVariants: ['scho\u0308n', 'gut'] }, 'schön')).toEqual(correct());
    expect(matchGermanAnswer({ answer: 'schön', acceptedVariants: ['scho\u0308n', 'gut'] }, 'gut')).toEqual(correct(2));
  });

  it.each([
    undefined, null, false, 3, {}, [], '', ' \t\r\n\u00a0 ',
    'a\u0000', 'a\u000b', 'a\u000c', 'a\u0085', 'a\u200b', 'a\u200c', 'a\u2060',
    'a\u202e', '\ufeffa', '\ud800', '\udc00', 'a\ud800b', 'a'.repeat(1001)
  ].map((value) => [value]))('classifies malformed learner input separately: %j', (input) => {
    expect(matchGermanAnswer({ answer: 'Haus' }, input)).toEqual({ status: 'invalid-input' });
  });

  it.each([
    undefined, null, false, 3, 'Haus', [], {},
    { answer: null }, { answer: 1 }, { answer: '' }, { answer: ' \t\u00a0' },
    { answer: 'a\u0000' }, { answer: '\ud800' }, { answer: 'a'.repeat(1001) },
    { answer: 'Haus', acceptedVariants: null }, { answer: 'Haus', acceptedVariants: 'Haus' },
    { answer: 'Haus', acceptedVariants: {} }, { answer: 'Haus', acceptedVariants: [null] },
    { answer: 'Haus', acceptedVariants: [''] }, { answer: 'Haus', acceptedVariants: ['\u200b'] },
    { answer: 'Haus', acceptedVariants: ['a'.repeat(1001)] },
    { answer: 'Haus', acceptedVariants: Array<string>(1) },
    { answer: 'Haus', acceptedVariants: Array<string>(21).fill('Haus') }
  ].map((value) => [value]))('rejects invalid exercise definitions before grading a valid answer: %j', (exercise) => {
    expect(matchGermanAnswer(exercise, 'Haus')).toEqual({ status: 'invalid-exercise' });
  });

  it.each([null, 'true', 1, 0, [], {}].map((value) => [value]))('rejects non-boolean flags: %j', (flag) => {
    expect(matchGermanAnswer({ answer: 'Haus', strictEszett: flag }, 'Haus')).toEqual({ status: 'invalid-exercise' });
    expect(matchGermanAnswer({ answer: 'Haus', testsCapitalization: flag }, 'Haus')).toEqual({ status: 'invalid-exercise' });
  });

  it('validates every variant even when the canonical answer would match', () => {
    expect(matchGermanAnswer({ answer: 'Haus', acceptedVariants: ['gut', 42] }, 'Haus')).toEqual({ status: 'invalid-exercise' });
  });

  it('accepts exactly 20 extra variants and returns the final original index', () => {
    const acceptedVariants = Array.from({ length: 20 }, (_, index) => `Variante ${index}`);
    expect(matchGermanAnswer({ answer: 'Haus', acceptedVariants }, 'Variante 19')).toEqual(correct(20));
  });

  it('measures raw UTF-16 limits inclusively before normalization or transliteration', () => {
    expect(matchGermanAnswer({ answer: 'a'.repeat(1000) }, 'a'.repeat(1000))).toEqual(correct());
    expect(matchGermanAnswer({ answer: '😀'.repeat(500) }, '😀'.repeat(500))).toEqual(correct());
    expect(matchGermanAnswer({ answer: '😀' }, '😀'.repeat(501))).toEqual({ status: 'invalid-input' });
    expect(matchGermanAnswer({ answer: 'é'.repeat(501) }, 'e\u0301'.repeat(501))).toEqual({ status: 'invalid-input' });
    expect(matchGermanAnswer({ answer: 'e\u0301'.repeat(501) }, 'é'.repeat(501))).toEqual({ status: 'invalid-exercise' });
    expect(matchGermanAnswer({ answer: 'ü'.repeat(500) }, 'ue'.repeat(500))).toEqual(correct(0, true));
    expect(matchGermanAnswer({ answer: 'ü'.repeat(1000) }, 'ue'.repeat(1000))).toEqual({ status: 'invalid-input' });
    expect(matchGermanAnswer({ answer: 'a' }, ' '.repeat(1000) + 'a')).toEqual({ status: 'invalid-input' });
  });

  it('accepts generated authorized mixed spellings without mutating the definition', () => {
    const symbols = fc.constantFrom('ä', 'ö', 'ü', 'ß', 'h', 'a', '!');
    fc.assert(fc.property(fc.array(fc.tuple(symbols, fc.boolean()), { minLength: 1, maxLength: 35 }), (parts) => {
      const replacements: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
      const answer = 'w' + parts.map(([symbol]) => symbol).join('');
      const input = 'w' + parts.map(([symbol, change]) => change ? replacements[symbol] ?? symbol : symbol).join('');
      const definition = Object.freeze({ answer });
      expect(matchGermanAnswer(definition, input)).toEqual(correct(0, input !== answer));
      expect(definition.answer).toBe(answer);
    }), { seed: 20261113, numRuns: 150 });
  });

  it('never accepts extra unlisted punctuation for generated ordinary words', () => {
    const word = fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 80 }).map((letters) => letters.join(''));
    fc.assert(fc.property(word, (answer) => {
      expect(matchGermanAnswer({ answer }, answer + '!')).toEqual({ status: 'incorrect' });
    }), { seed: 20261113, numRuns: 150 });
  });

  it('is deterministic and preserves frozen definitions for arbitrary strings', () => {
    const definition = Object.freeze({ answer: 'schön', acceptedVariants: Object.freeze(['gut']), strictEszett: true });
    fc.assert(fc.property(fc.string({ maxLength: 200 }), (input) => {
      const first = matchGermanAnswer(definition, input);
      expect(matchGermanAnswer(definition, input)).toEqual(first);
      expect(definition).toEqual({ answer: 'schön', acceptedVariants: ['gut'], strictEszett: true });
      expect(['correct', 'incorrect', 'invalid-input']).toContain(first.status);
    }), { seed: 20261113, numRuns: 150 });
  });
});
