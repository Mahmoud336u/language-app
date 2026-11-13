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

/** Pure D-03/D-04 boundary. It returns feedback data and never records an attempt. */
export function matchGermanAnswer(exercise: unknown, answer: unknown): AnswerMatchResult {
  if (typeof exercise !== 'object' || exercise === null || Array.isArray(exercise)) return { status: 'invalid-exercise' };
  const definition = exercise as Record<string, unknown>;
  if ((definition.strictEszett !== undefined && typeof definition.strictEszett !== 'boolean')
    || (definition.testsCapitalization !== undefined && typeof definition.testsCapitalization !== 'boolean')) {
    return { status: 'invalid-exercise' };
  }
  if (definition.acceptedVariants !== undefined
    && (!Array.isArray(definition.acceptedVariants) || definition.acceptedVariants.length > 20)) {
    return { status: 'invalid-exercise' };
  }
  const accepted: string[] = [];
  const variants: unknown[] = definition.acceptedVariants === undefined ? [] : definition.acceptedVariants as unknown[];
  for (const raw of [definition.answer, ...variants]) {
    const normalized = normalizeAnswer(raw);
    if (normalized === undefined) return { status: 'invalid-exercise' };
    accepted.push(normalized);
  }
  const input = normalizeAnswer(answer);
  if (input === undefined) return { status: 'invalid-input' };
  for (const [index, expected] of accepted.entries()) {
    if (input === expected) return { status: 'correct', matchedAnswerIndex: index, transliterationUsed: false, caseDifference: false };
  }
  if (definition.testsCapitalization !== true) {
    for (const [index, expected] of accepted.entries()) {
      if (input.toLocaleLowerCase('de-DE') === expected.toLocaleLowerCase('de-DE')) {
        return { status: 'correct', matchedAnswerIndex: index, transliterationUsed: false, caseDifference: true };
      }
    }
  }
  for (const [index, expected] of accepted.entries()) {
    if (matchesTransliteration(expected, input, definition.strictEszett === true)) {
      return { status: 'correct', matchedAnswerIndex: index, transliterationUsed: true, caseDifference: false };
    }
    if (definition.testsCapitalization !== true
      && matchesTransliteration(expected.toLocaleLowerCase('de-DE'), input.toLocaleLowerCase('de-DE'), definition.strictEszett === true)) {
      return { status: 'correct', matchedAnswerIndex: index, transliterationUsed: true, caseDifference: true };
    }
  }
  return { status: 'incorrect' };
}
