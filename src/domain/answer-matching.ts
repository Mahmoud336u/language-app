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

/** Behaviorless seam so RED exercises missing matching behavior, not a failed import. */
export function matchGermanAnswer(exercise: unknown, answer: unknown): AnswerMatchResult {
  void exercise;
  void answer;
  throw new Error('German answer matching is not implemented.');
}
