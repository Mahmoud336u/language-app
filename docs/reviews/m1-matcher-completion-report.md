# First M1 slice — German typed-answer matcher

Date: 2026-11-13. Scope: the owner-approved matcher only, not all of M1.
Review/decision dependency: [PR #2](https://github.com/Mahmoud336u/language-app/pull/2).

## Authorization and architecture

Architecture review: **required**, retained in
[the v2 review](product-decisions-v2-review.md) at `6a621b1`. Advisory verdict:
VALIDATE FIRST. The owner subsequently approved the exact D-03/D-04 rules,
examples, Tier 1 plan, and matcher-only implementation in the conversation.
[The authorization record](m1-matcher-owner-authorization.md) quotes those replies.
Canonical decisions were recorded in separate decision commit `49ed4ac` before
tests. No approval is inferred from an agent-written PR badge or commit trailer.

D-05 preservation and D-15 A1 pilot are approved for direction/scope only. Sessions,
storage, scheduler, PWA, character-key UI, courses, and public release are outside
this implementation. The domain module is not connected to the foundation UI.

## Implementation

`src/domain/answer-matching.ts` implements a pure, bounded runtime boundary:
canonical/explicit-variant matching; NFC and permitted whitespace normalization;
directional mixed transliteration; independent strict ß/capitalization flags;
stable match precedence/references; and separate incorrect/input-error/content-error
results. No clocks, randomness, network, persistence, UI imports, or grading state.

All exercise answers are validated before matching. Unicode surrogate pairing is
checked on raw text before any operation can join separated code units. A set of
reachable input positions supports transliteration without enumerating every
spelling or treating answers as regex syntax. The approved limits are 1,000 raw
UTF-16 code units per answer and 20 additional variants.

Added 138 matcher tests in three new contract files. Stryker 10.1.1 and its compatible
Vitest runner are pinned. Mutation configuration lives under protected `scripts/`,
and CI runs a separate `mutation` job with JSON/HTML artifacts. Generated output
directories are excluded from sandbox copying/lint; authoritative source and tests
remain included. No test thresholds, mutators, or assertions were relaxed.

## TDD and defect evidence

| Stage | Commit | Observed result |
| --- | --- | --- |
| Importable seam/tooling | `a65a94f` | Matcher deliberately throws; no behavior implemented. Typecheck passed. |
| RED | `0548c29` | 131 matcher contracts failed on missing behavior through a working import. |
| GREEN | `ff497c0` | 193 total tests passed: 131 matcher + 62 foundation. Lint/types passed. |
| Mutation counterexamples | `f004010` | Four new assertions failed against three injected arbitrary-alternative faults, then passed against unchanged real code. Fault injection was restored before commit. |
| REFACTOR | `039fe25` | Separated validation/feedback construction and cached learner lowercase. All 197 then-existing tests, lint, types, and build passed. |
| Unicode regression RED | `dd6c8dc` | Three new tests failed because a tab/CR/LF between surrogate halves was incorrectly treated as an ordinary answer. |
| Unicode regression GREEN | `a441ad7` | Validate raw pairing first; all 200 tests passed. |

Frozen tests were never amended. The supplementary counterexamples verify existing
approved no-false-acceptance behavior; they do not change product expectations.
The Unicode failure was a production defect, fixed in production code after a new
RED commit. No further structural refactor was warranted for that small fix.

## Local quality results

Environment: Linux, Node 24.22.1, npm 11.9.0, UTC, system Chromium. GitHub uses its
own clean install and pinned Playwright browser; its results are recorded on the
implementation PR separately from these local observations.

| Command / area | Result | Evidence |
| --- | --- | --- |
| `npm run test:run` | PASSED | `Test Files 6 passed (6)`; `Tests 200 passed (200)` |
| Domain contracts | PASSED | 138 matcher tests, including seeded property tests |
| Existing foundation regression | PASSED | All 62 existing Vitest tests unchanged and passing |
| `npm run lint` | PASSED | Final ESLint run exited 0 with max warnings 0 |
| `npm run typecheck` | PASSED | Final `tsc --noEmit` exited 0 |
| `npm run build` | PASSED | Final production build succeeded during deployment verification |
| `npm run test:e2e` | PASSED | `14 passed (36.1s)`; unchanged UI, desktop/mobile keyboard, axe, errors, reflow, reduced motion |
| `npm run test:deployment` | PASSED | `6 passed (17.2s)` with local Wrangler |
| `npm run test:mutation` | PASSED command; findings REVIEWED | 191 mutants: 189 killed, 2 equivalent survivors, 0 timeouts, 0 uncovered, 0 errors; score 98.95% |

The 197 Tier 1 tests are a subset of the 200 Vitest tests; three component tests
complete that total. Property iterations are not counted as additional tests.
No claim is made about a full learning journey, iOS durability, reviewed curriculum,
or end-to-end integration of the matcher into lessons.

## Mutation findings and limitations

The first run killed 195 of 200 mutants (97.50%). Three survivors inserted arbitrary
accepted alternatives. New counterexamples now detect those faults. Reviewing a
validation-copy survivor exposed the malformed-surrogate defect described above;
this is why a high score was not treated as proof of correctness.

The final run targets source at `a441ad7` and executes all 138 related matcher tests.
Its two survivors were reviewed against the final code:

1. **Mutant 19, normalization line 25:** replace the empty string used in a
   temporary control-validation copy with `Stryker was here!`. After raw surrogates
   have been rejected, removing permitted control whitespace or replacing it with
   ordinary non-control text gives the same Cc/Cf predicate result. The copy is
   discarded; normalization still uses the original text. Invalid controls remain
   detectable. This equivalence depends on the raw-surrogate fix.
2. **Mutant 76, transliteration line 46:** disable the early return when no reachable
   input positions remain. An empty position set can never become non-empty in a
   later iteration, so the final membership check still returns false. The change
   performs unnecessary bounded work but does not change an answer result.

Neither survivor is hidden or counted as killed. No mutation exclusions were added.
Mutation score is evidence about these generated faults, not proof of all possible
correctness. JSON/HTML reports are generated under `reports/mutation/` and uploaded
by CI for 14 days. Local report SHA-256:
`9839d88aae31f20f2c0fa2ed12806774936de428337252ce64dccf65d8c75cb2`.
Verified domain source SHA-256:
`ddeb4d3d8eeba7c5705b4f2545bc91a0cb51616939f5651bacdb136594e868ab`.

One intermediate mutation run failed while copying a generated Playwright result
that the browser runner was deleting. Sandbox copying now omits generated browser
outputs. A subsequent lint run exposed copied mutation sandboxes as extra config
roots; lint now ignores those generated copies and explicitly sets its project
root. These were tooling failures, not passing runs. Source/test discovery and
strictness remain intact; final checks must pass after the fixes.

## Integrity, merge order, and outstanding work

- Unauthorized Tier 1 edits: **0**.
- Unauthorized deletions, skipped tests, or expected-output changes: **0**.
- Tier 2 revisions: **0**.
- Tests added: three new contract files; no existing test/support file changed.
- Product implementation: only the approved matcher; D-05/D-15 remain direction/scope.

Decision PR #2 should land before the dependent implementation PR, preserving all
commits. Protected package/configuration/workflow changes deliberately cause the
history checker to require owner review. The checker has no chat-approval bypass;
an owner-approved product contract is not permission to rewrite frozen tests or
forge a green integrity status. Review the exact protected diff and use only the
documented owner-controlled process. No force-push, merge, ruleset change, or
deployment was performed by the agent.

Separate non-admin identity, required-status enforcement, and a disposable tamper
PR remain unverified. The connector's workflow-run listing exposes ordinary PR
runs; the trusted target-event workflow result must be checked independently.
This slice does not complete all M1 exit criteria: sessions, persistence, scheduling,
and the remaining domain contracts require later approvals and implementation.
