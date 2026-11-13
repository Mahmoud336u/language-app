# German typed-answer matcher

The first approved M1 slice is a pure domain function in
`src/domain/answer-matching.ts`. D-03/D-04 in `product-decisions.md` define its
behavior. The owner approved the exact rules, examples, and Tier 1 plan in PR #2's
review; the conversation authorization is recorded under `docs/reviews/`.

```ts
import { matchGermanAnswer } from './src/domain/answer-matching';

matchGermanAnswer({ answer: 'schön' }, 'schoen');
// { status: 'correct', matchedAnswerIndex: 0,
//   transliterationUsed: true, caseDifference: false }

matchGermanAnswer({ answer: 'Maße', strictEszett: true }, 'Masse');
// { status: 'incorrect' }
```

These illustrate reviewed test expectations, not shipping lesson content.

## Boundary and results

`GermanAnswerDefinition` describes a canonical `answer`, optional `acceptedVariants`,
and optional boolean `strictEszett` / `testsCapitalization` flags. The function
accepts `unknown` at runtime and validates the whole definition and learner input.

Results are `correct`, `incorrect`, `invalid-input`, or `invalid-exercise`.
Only correct results contain `matchedAnswerIndex`, `transliterationUsed`, and
`caseDifference`. Index zero identifies the canonical answer; index n identifies
`acceptedVariants[n - 1]`. Original indexes survive normalized duplicates.

Invalid content must not be converted into an incorrect learner attempt. The caller
owns how errors are displayed. The matcher neither records attempts nor computes
scores, progress, scheduling grades, or learner-facing explanations.

## Matching order and resource bounds

All authorized answers are validated before grading. The matcher tries exact
normalized matches across all answers, then ordinary case-only matches, then
transliteration. Canonical order breaks ties within a class. It normalizes only
the owner-approved NFC and whitespace equivalents; punctuation and word order remain
significant. Uppercase/lowercase is evaluated with German-locale whole-string
lowercase, without folding ß to ss or umlauts to bare vowels.

Transliteration proceeds from authorized text to learner text. A bounded set of
reachable input positions supports mixed substitutions without generating every
possible spelling. Literal string comparisons avoid treating input as a regular
expression. Strict ß blocks ß/ẞ substitutions; strict capitalization still allows
the explicitly approved uppercase digraphs.

Every raw answer is limited to 1,000 UTF-16 code units, before normalization, with
at most 20 additional variants. Control/format characters, unpaired surrogates,
invalid flags, empty normalized text, and malformed variants are rejected according
to the approved contract. No clock, random source, network, or mutable global state
is needed. Objects are read without modifying their answer arrays or fields.

## Verification and scope

The original 131 contracts cover the reviewed plan; four additional mutation
counterexamples protect against invented alternatives, and three regression cases
protect raw surrogate validation across control whitespace. Existing contract files
stay frozen. Mutation analysis targets all `src/domain/**/*.ts`, using Stryker's
related-test selection; the full regression suite remains a separate required run.
Configuration lives under protected `scripts/`, so future mutation-discovery or
reporting changes require owner review.

This module is not yet connected to the neutral foundation UI. Character keys,
session integration, other exercise types, persistence, grading, and content
delivery need their own approved slices. See the [slice report](reviews/m1-matcher-completion-report.md)
for commands, commit history, mutation findings, and enforcement limitations.
