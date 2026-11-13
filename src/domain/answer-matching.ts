/** Approved D-03/D-04 input shape; the runtime boundary also accepts unknown data. */
export interface GermanAnswerDefinition {
  readonly answer: string;
  readonly acceptedVariants?: readonly string[];
  readonly strictEszett?: boolean;
  readonly testsCapitalization?: boolean;
}

export type AnswerMatchResult =
  | {
    readonly status: 'correct';
    /** Zero identifies the canonical answer; n > 0 identifies acceptedVariants[n - 1]. */
    readonly matchedAnswerIndex: number;
    readonly transliterationUsed: boolean;
    readonly caseDifference: boolean;
  }
  | { readonly status: 'incorrect' | 'invalid-input' | 'invalid-exercise' };

function normalizeAnswer(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 1000) return undefined;
  // Remove only the permitted control whitespace before rejecting controls,
  // formatting marks and unpaired UTF-16 surrogates. Valid surrogate pairs survive.
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value.replace(/[\t\r\n]/g, ''))) return undefined;
  const normalized = value.normalize('NFC').replace(/[ \t\r\n\u00a0]+/g, ' ').replace(/^ | $/g, '');
  return normalized.length === 0 ? undefined : normalized;
}

const replacements: Readonly<Record<string, readonly string[]>> = {
  ä: ['ae'], ö: ['oe'], ü: ['ue'], ß: ['ss'],
  Ä: ['Ae', 'AE'], Ö: ['Oe', 'OE'], Ü: ['Ue', 'UE'], ẞ: ['SS']
};

/** Read from the authorized answer only; never reverse-expand the learner's text. */
function matchesTransliteration(expected: string, input: string, strictEszett: boolean): boolean {
  let positions = new Set([0]);
  for (const symbol of expected) {
    const variants = strictEszett && (symbol === 'ß' || symbol === 'ẞ') ? [] : replacements[symbol] ?? [];
    const next = new Set<number>();
    for (const position of positions) {
      for (const spelling of [symbol, ...variants]) {
        if (input.startsWith(spelling, position)) next.add(position + spelling.length);
      }
    }
    if (next.size === 0) return false;
    positions = next;
  }
  return positions.has(input.length);
}

interface ValidatedDefinition {
  answers: string[];
  strictEszett: boolean;
  testsCapitalization: boolean;
}

function validateDefinition(exercise: unknown): ValidatedDefinition | undefined {
  if (typeof exercise !== 'object' || exercise === null || Array.isArray(exercise)) return undefined;
  const definition = exercise as Record<string, unknown>;
  if ((definition.strictEszett !== undefined && typeof definition.strictEszett !== 'boolean')
    || (definition.testsCapitalization !== undefined && typeof definition.testsCapitalization !== 'boolean')) {
    return undefined;
  }
  if (definition.acceptedVariants !== undefined
    && (!Array.isArray(definition.acceptedVariants) || definition.acceptedVariants.length > 20)) {
    return undefined;
  }
  const accepted: string[] = [];
  const variants: unknown[] = definition.acceptedVariants === undefined ? [] : definition.acceptedVariants as unknown[];
  for (const raw of [definition.answer, ...variants]) {
    const normalized = normalizeAnswer(raw);
    if (normalized === undefined) return undefined;
    accepted.push(normalized);
  }
  return { answers: accepted, strictEszett: definition.strictEszett === true, testsCapitalization: definition.testsCapitalization === true };
}

function correct(matchedAnswerIndex: number, transliterationUsed: boolean, caseDifference: boolean): AnswerMatchResult {
  return { status: 'correct', matchedAnswerIndex, transliterationUsed, caseDifference };
}

/** Pure D-03/D-04 boundary. It returns feedback data and never records an attempt. */
export function matchGermanAnswer(exercise: unknown, answer: unknown): AnswerMatchResult {
  const definition = validateDefinition(exercise);
  if (definition === undefined) return { status: 'invalid-exercise' };
  const input = normalizeAnswer(answer);
  if (input === undefined) return { status: 'invalid-input' };
  const exactIndex = definition.answers.indexOf(input);
  if (exactIndex !== -1) return correct(exactIndex, false, false);
  const foldedInput = input.toLocaleLowerCase('de-DE');
  if (!definition.testsCapitalization) {
    for (const [index, expected] of definition.answers.entries()) {
      if (foldedInput === expected.toLocaleLowerCase('de-DE')) {
        return correct(index, false, true);
      }
    }
  }
  for (const [index, expected] of definition.answers.entries()) {
    if (matchesTransliteration(expected, input, definition.strictEszett)) {
      return correct(index, true, false);
    }
    if (!definition.testsCapitalization
      && matchesTransliteration(expected.toLocaleLowerCase('de-DE'), foldedInput, definition.strictEszett)) {
      return correct(index, true, true);
    }
  }
  return { status: 'incorrect' };
}
