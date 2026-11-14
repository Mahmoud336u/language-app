# M1 session save/resume — implementation report

Date: 2026-11-14. PR: [#13](https://github.com/Mahmoud336u/language-app/pull/13).
Status: implementation quality checks passed; trusted integrity remains blocked by
the explicitly approved frozen-test correction. This is not M1 or MVP completion.

## Authorization and delivered boundary

Architecture review: required, retained in
[the approved review](m1-session-persistence-review.md). Its BUILD NOW verdict was
advisory; [owner authorization](m1-session-owner-authorization.md) approved the
amended C-01–C-06 contract/test plan under D-05 v2 and scoped D-10 v1. Decision
[PR #11](https://github.com/Mahmoud336u/language-app/pull/11) merged before this
implementation, at `9f86ba5d4c1338d5276f2f2f8372868b386d6f40`.

Implemented pure snapshot/attempt/discard transitions, derived progress, strict
Zod validation, a session application service, one atomic repository port, and a
native IndexedDB adapter. Save acknowledgment waits for transaction completion;
exact retries never double count; competing answers require reload; discard keeps
saved attempts. Corrupt/future data is preserved and reported distinctly. Time is
injected, and inactivity never mutates state. See [API documentation](../session-persistence.md).

The production UI remains the neutral foundation harness. No lesson interface,
reviewed content, scheduler, account, sync, telemetry, migration, backup/import,
or deployment was added. The storage harness and synthetic content are test-only;
inspection of `dist` confirms no storage harness or fixtures are shipped.

## TDD and refactoring evidence

| Stage | Commit | Observed result |
| --- | --- | --- |
| Behaviorless domain seam | `1a61117` | Strict typecheck passed; no feature behavior claimed. |
| Domain RED | `144c975` | 28 meaningful failures / 37 passing cases; 65 total. [CI](https://github.com/Mahmoud336u/language-app/actions/runs/43556644130). That run also exposed the lint mistake described below. |
| Approved test correction | `cc973a5` | Replace six non-null accesses with a checked fixture helper; no behavior/assertion changes. Original history preserved. |
| Domain GREEN | `a6bcaf7` | All 65 domain/state-validation tests passed; lint/typecheck passed. |
| Application RED | `eb78234` | 14 meaningful failures / 1 passing case against behaviorless service; tests linted/typechecked before freezing. |
| Application GREEN | `1c09945` | All 15 application contracts passed. |
| Browser RED | `07bb769` | 14 local Chromium failures; [CI](https://github.com/Mahmoud336u/language-app/actions/runs/43604808050/job/132477047459) verified 42 assertion failures across three engines against the unavailable repository seam. Existing UI checks passed. |
| Browser GREEN | `f348808` | 14 local storage passes; [CI](https://github.com/Mahmoud336u/language-app/actions/runs/43605228935/job/132478344739) verified all 42 storage cases plus the 14 existing UI cases. |
| Mutation counterexamples | `6fde79f` | Ten new cases pass real code and fail seven individually injected surviving faults. Temporary faults restored before committing; no frozen file edited. |
| REFACTOR | `78f5e52` | Name derived view fields without changing formulas; all 356 Vitest cases, lint, typecheck, and build passed. |

Refactoring names the derived view fields before returning the projection; formulas
and contracts remain unchanged. A preliminary attempt to remove matcher-result
reconstruction failed strict typecheck because the existing result type groups
incorrect and invalid statuses. That attempt was restored before commit; it is not
passing evidence. A mutation run started on that intermediate source was stopped
and is not counted as a completed run.

## Verification

The first complete implementation [quality run](https://github.com/Mahmoud336u/language-app/actions/runs/43605228935)
passed all eight jobs. The [post-refactor run](https://github.com/Mahmoud336u/language-app/actions/runs/43605925092)
tracks the final source at `78f5e52`. No failed or unexecuted check counts as passing.
The owner accepts linked CI evidence instead of pasted terminal output.

Final source verification at `78f5e52`: all eight ordinary quality jobs **PASSED**.

| Check | Verified result |
| --- | --- |
| `lint`, `typecheck`, `build` | Passed in local execution and CI. |
| `test:run` | 356 cases passed in 12 files; 90 new domain/service cases plus 266 existing cases. |
| `integrity-contracts` | 353 contract cases passed in 11 files; subset of the 356 total. |
| `test:e2e` | 14 existing UI/accessibility cases plus 42 storage cases (14 per Chromium/Firefox/WebKit) passed in CI. Local execution passed 14 UI plus 14 Chromium storage cases. |
| `deployment-compatibility` | Six local-Wrangler cases passed in CI and locally; no deployment occurred. |
| `mutation` | Completed successfully; findings reviewed below, including surviving mutants and runtime errors. |
| Trusted `test-integrity` | **FAILED**, as expected for the approved frozen-file correction; not waived or misreported. |

Local observations before the final counterexamples/refactoring:

- Vitest: 346 passing cases (343 contract cases plus three UI cases).
- Lint, typecheck, and production build passed.
- Browser: 14 existing UI/accessibility cases plus 14 Chromium storage cases passed.
- Local Wrangler deployment compatibility: six cases passed; no infrastructure provisioned.
- Initial domain mutation run: 511 mutants, 489 killed, 18 survived, four runtime
  errors, zero uncovered/timeouts; score 96.45%. Errors are not killed mutants.

The browser tests exercise real transactions, reload, concurrent connections,
idempotent races, stale discard, corruption preservation, missing/future databases,
and versionchange closure. Injected denial/quota faults supplement real persistence.
The abort-after-request-success tests prove that request success cannot be reported
as a committed save. WebKit coverage is not iOS Safari durability certification.

## Mutation review

The first full report at `f348808` identified seven non-equivalent survivors now
detected by the new `session-mutation.test.ts` file. Each was injected separately
and produced a failing test before unchanged source was restored:

| Original mutant ID | Fault detected by the new cases |
| --- | --- |
| 201 | Changing a variant's maximum length into a minimum rejects approved short variants. |
| 282 | Removing unique attempt-ID validation accepts duplicate IDs in an otherwise correctly ordered history. |
| 329 / 347 | Removing object guards throws on primitive records/snapshots instead of reporting corrupt data. |
| 394 | Reading attempt index 1 instead of the last attempt reports the wrong activity time after three answers. |
| 411 / 486 | Removing persisted validation before submission/discard exposes corrupt state to transitions. |

Remaining survivors were reviewed against validated public inputs:

- Matcher 19/76 retain the previously documented equivalences: a discarded
  control-validation copy and an unnecessary early exit when reachable positions
  are empty. See [matcher review](m1-matcher-completion-report.md).
- Schema 206 changes the validation probe, but exercise validity is determined
  before learner-input validity; the predicate checks only `invalid-exercise`.
- Schema 233 substitutes ordinary text for permitted whitespace in a discarded
  control-check copy; the original prompt and Unicode-pair validation are retained.
- Schema 273 and 293 each remove one of two overflow defenses. The other still
  rejects attempts extending beyond the item array; neither fault changes a result.
- Session 353 removes a number-type guard already implied by `Number.isInteger`.
- Session 390 removes optional access where a validated active record necessarily
  has a current occurrence. `sessionView` operates on validated records.
- Session 460/462 remove or alter the unreachable invalid-exercise return after
  strict persisted-definition validation. The matcher still guards this outcome.
- Session 471 preserves the existing incorrect result instead of reconstructing
  its identical one-field shape; feedback values are unchanged. The original
  conditional is useful for narrowing the matcher's grouped TypeScript result type.

The four runtime errors are mutations of module-level schema construction
(answer-field defaults or discriminated-union key/options). They stop test-module
initialization, not an assertion. They are reported as errors, never killed or
passing tests. No exclusions, thresholds, mutators, or frozen expectations changed.
The score is evidence about generated faults, not proof of complete correctness.

The [final-source mutation run](https://github.com/Mahmoud336u/language-app/actions/runs/43605925092/job/132480423403)
completed successfully: **511 mutants, 496 killed, 11 reviewed equivalent survivors,
four runtime errors, zero uncovered/timeouts; 97.83% score**. All seven targeted
survivors are now detected. The four errors remain explicitly reported above.
CI uploads JSON/HTML evidence as the `mutation-report` artifact for 14 days.

## Integrity and owner action

- Tier 1 modifications without approval: **0**.
- Approved Tier 1 modifications: **one file**, mechanical correction `cc973a5`.
- Unauthorized deletions, skips, or expected-output changes: **0**.
- Tier 2 revisions: **0**.
- New source/test files and history are retained; no force-push or squash/rebase.

Before integrating main, the checker reported one `FROZEN_CHANGE` for the approved
correction and three `GOVERNANCE_CHANGE` findings for the approved browser
CI/configuration setup (`.github/workflows/quality.yml`, `package.json`,
`playwright.storage.config.ts`). Main subsequently merged the README roadmap;
merge `72489fa` preserves that documentation without changing implementation or
tests relative to its feature parent. The history checker also reports inherited
changes at this merge: **two frozen findings for the same approved file correction
and six governance findings in total**. All eight findings remain visible; the
merge did not introduce another test edit. The exact source/test/configuration tree
remains identical to verified `78f5e52`.
Passing checker-contract tests does not mean this branch passes trusted integrity.
The [trusted run](https://github.com/Mahmoud336u/language-app/actions/runs/43605954516)
fails; an ordinary review or `/integrity-approve` cannot clear the frozen finding.

See [the correction request and exact owner reply](m1-session-test-correction.md).
Approval of the mechanical edit does not authorize changing enforcement, branch
rules, or merging. A separate owner-controlled merge route remains necessary.
The coding identity stays @Mahmoud336u and the eligible independent reviewer is
@Mahmoud44G; the existing admin-access limitation remains documented in `docs/ci.md`.

## Remaining work

Resolve the approved-test-correction merge route, obtain independent review, and
complete the trusted gate before claiming this slice complete. Backup/export and
import/recovery are the next persistence slice, requiring their own exact contract
and owner review. **No learner pilot before that slice exists, is reviewed, and
passes its approved checks.** Scheduler decisions, reviewed course content, UI,
accessibility of the actual learning journey, and other M1–M5 work remain separate.
