# M0 implementation and verification report

Updated: 2026-11-14.
Repository: `Mahmoud336u/language-app`.
Application: **Unpause Languages**.
Closure branch: `m0/close-foundations`.
Closure PR: [#8](https://github.com/Mahmoud336u/language-app/pull/8).

## Current status

**Engineering implementation and observed CI checks pass. M0 closure remains
pending evidence for the history-protection drills, final documentation review,
merge of PR #8, and verification of the resulting main run.**

The verification checklist previously marked all items complete without including
the history-drill terminal output. Those items must remain pending evidence rather
than being represented as independently verified.

No production deployment has been performed. M0 completion does not establish
production readiness.

## Architecture and authorization

The original review is retained in
[m0-architecture-review.md](m0-architecture-review.md). Its advisory verdict was
SIMPLIFY FIRST. Owner authorization for the engineering contract plan and G-01–G-06
amendments is recorded in
[m0-owner-authorization.md](m0-owner-authorization.md).

The approved foundation uses strict TypeScript, React/Vite static assets, a
neutral design foundation, local test tooling, and no mandatory external service.
Persistence semantics remain subject to an exact approved D-10 contract.

The integrity acknowledgment review and implementation evidence are retained in:

- [integrity-approval-review.md](integrity-approval-review.md)
- [integrity-approval-completion.md](integrity-approval-completion.md)

This closure updates documentation and verification records. It introduces no new
learner behavior or runtime architecture.

## Delivered foundation

- Pinned Node/npm, lockfile, strict TypeScript, executable package scripts, ESLint,
  Vitest, Testing Library, fast-check, Playwright, and axe.
- Git-object inspection protecting contracts from their first commit, including
  feature-branch commits and merge-parent changes.
- Frozen shared test support and historical detection of changes later restored.
- Trusted-base provenance for Tier 2 revisions.
- Separate candidate quality execution and trusted integrity inspection.
- Human authorization for governance-only findings, bound to exact PR metadata
  and findings.
- Protected-path CODEOWNER review.
- Responsive neutral component harness, original visual tokens, keyboard focus,
  reduced motion, validation, and honest availability.
- Static Cloudflare-compatible output, restrictive headers, real missing-asset
  404 responses, and local deployment checks.
- Architecture, testing, design, content, deployment, and CI documentation.
- Trusted integrity summaries and downloadable log artifacts.

No old Lovable implementation or reference-site assets were imported.

## Repository milestones already merged

| PR | Result |
| --- | --- |
| [#1](https://github.com/Mahmoud336u/language-app/pull/1) | Engineering foundations merged |
| [#2](https://github.com/Mahmoud336u/language-app/pull/2) | Approved matcher contracts and scoped product directions recorded |
| [#3](https://github.com/Mahmoud336u/language-app/pull/3) | Approved M1 German answer matcher merged |
| [#4](https://github.com/Mahmoud336u/language-app/pull/4) | Trusted governance acknowledgment mechanism merged |
| [#5](https://github.com/Mahmoud336u/language-app/pull/5) | Trusted integrity-log visibility merged after checks and review |
| [#6](https://github.com/Mahmoud336u/language-app/pull/6) | Duplicate CODEOWNERS PR closed without merging |
| [#7](https://github.com/Mahmoud336u/language-app/pull/7) | Protected-path review transferred to @Mahmoud44G |

The M1 matcher is recorded here as subsequent repository context, not as an M0
deliverable. Sessions, persistence, scheduling, curriculum, and the full learning
experience remain unimplemented.

## Historical foundation TDD evidence

These are the original M0 results, not current-suite totals.

| Slice | RED | GREEN |
| --- | --- | --- |
| History integrity | `d051760`: 56 meaningful failures | `cedc622`: 56 passed |
| Neutral harness | `07a2dfb`: 3 UI failures and 14 browser failures | `0e207d5`: 3 UI and 14 browser tests passed |
| Static deployment | `6df257c`: 4 failed, 2 passed | `ae60e22`: all 6 passed |
| Deployment-test provenance | `4fd957f`: 3 new failures, 56 existing contracts passed | `e6e77b6`: all 59 integrity contracts passed |

REFACTOR commit `679bf65` extracted the sample form. Applicable checks passed
afterward. Separate commits preserve the observed RED/GREEN/REFACTOR history.

The original foundation had 62 Vitest tests, including 59 integrity contracts.
Original local validation also passed lint, typecheck, build, 14 E2E tests, and
6 deployment checks using Node 24.22.1, npm 11.9.0, UTC, and system Chromium.

The original GitHub verification is retained at
[run 43347686525](https://github.com/Mahmoud336u/language-app/actions/runs/43347686525)
for implementation commit `1066fb41c6173ace484b23a1b25e5e26a60aac90`.

At bootstrap, the raw audit correctly reported 25 governance findings over
12 inspected commits. The original main had no trusted checker; candidate tests
did not authorize their own installation. This is historical bootstrap evidence,
not the current enforcement state.

Later integrity-wrapper and matcher TDD evidence is retained in their respective
completion reports.

## Verified main results

Revision: `cdb6ca6a6db039b77f720840f30152d527cec45b`.

Source:
[main quality run 43521673857](https://github.com/Mahmoud336u/language-app/actions/runs/43521673857).

| Check | Actual result |
| --- | --- |
| Lint | PASSED |
| TypeScript | PASSED |
| Full Vitest suite | PASSED: 266 tests across 8 files |
| Contract suite | PASSED: 263 tests across 7 files |
| Browser E2E | PASSED: 14 tests |
| Deployment compatibility | PASSED: 6 tests |
| Production build | PASSED |
| Mutation testing | PASSED: 98.95%; 189 killed, 2 survived, 0 timeout, 0 uncovered, 0 errors |

The 263 contract tests are included in the 266-test total; do not add them
together. The contract suite now includes domain contracts as well as integrity
contracts.

The two surviving mutants were reviewed in
[m1-matcher-completion-report.md](m1-matcher-completion-report.md).
The score does not replace semantic review.

These results belong to the stated main revision. They do not automatically
certify later documentation commits or the final merged revision.

## Closure-PR CI evidence

Observed PR #8 revision:
`e148e9cf38ae192b1e1881bc9f2794f541ecc34d`.

- [Quality run 43533345073](https://github.com/Mahmoud336u/language-app/actions/runs/43533345073): PASSED.
- [Trusted integrity run 43533341541](https://github.com/Mahmoud336u/language-app/actions/runs/43533341541): PASSED.

The earlier harmless revision
`0c92c3358d640c817fd7e9df112da370786aeb80` also passed quality and trusted integrity:

- [Quality run 43526905228](https://github.com/Mahmoud336u/language-app/actions/runs/43526905228)
- [Trusted integrity run 43526905957](https://github.com/Mahmoud336u/language-app/actions/runs/43526905957)

The trusted run created the `test-integrity-log` artifact.

Any commits adding this report require their own final checks and review.
The final post-merge main run remains pending.

## Account roles and settings

The owner explicitly selected:

- @Mahmoud336u: repository owner, coding, branch pushes, normal PR authorship, and
  personal governance-integrity acknowledgments.
- @Mahmoud44G: protected-path review, PR approval/rejection, and merge after
  requirements pass.

CODEOWNERS is installed on main. PR #5 demonstrates the normal arrangement:
@Mahmoud336u authored it and @Mahmoud44G submitted an approving review.

The owner retained an admin-capable coding account as an explicit exception to
the original non-admin coding recommendation. The exception does not authorize
agents to bypass protections or post owner acknowledgment commands.

GitHub API checks on 2026-11-14 confirmed:

- Public repository.
- Active main ruleset `27225437`, targeting the default branch.
- Active feature-history ruleset `27225932`, targeting all branches except main.
- No bypass actors in either ruleset.
- Main requires one approving review, CODEOWNER review, approval after the last
  reviewable push, dismissal of stale approvals, and conversation resolution.
- Main requires all nine current check contexts, bound to GitHub Actions, with
  the branch up to date.
- Main and feature branches block deletion and non-fast-forward updates.
- Main permits merge commits, preserving separate test-first commits.

Saved settings are verified. Actual rewrite/deletion rejection evidence is still
pending inclusion in the live verification record.

## Live enforcement evidence

See [m0-live-verification.md](m0-live-verification.md) for evidence and open items.

Verified:

1. Harmless PR #8 has successful quality and trusted integrity runs.
2. PR #8 was observed merge-blocked while an eligible approving review was missing.
3. A trusted integrity-log artifact was produced.
4. PR #9 deliberately edited `tests/contracts/integrity.test.ts`.
5. Trusted inspection rejected it with `FROZEN_CHANGE` and decision `blocked`.
6. PR #9 is closed without merging.

Tamper evidence:
[run 43529660335](https://github.com/Mahmoud336u/language-app/actions/runs/43529660335),
head `8b87c2146f2d49583231a2313fe887dea0f5e3bd`.

Pending evidence:

- Feature-branch backward-update rejection.
- Feature-branch deletion rejection.
- Final review and merge of PR #8.
- Successful quality run on the resulting main revision.

A checked box alone is insufficient evidence for the history drills. Include
the actual command, target branch, terminal result, and observation date.

## Test integrity

This documentation closure changes no tests, expected outputs, skip settings,
thresholds, or enforcement implementation.

The historical implementation reports record zero unauthorized test edits,
deletions, skipped tests, and expected-output changes.

PR #9 is an isolated owner-authorized negative test, not a product change.
It inserted a comment into a frozen file, was correctly rejected, and was closed
without merging. No assertion or expected value changed.

Owner authorization to conduct the probe did not waive the checker failure.
Do not merge the probe or weaken enforcement to make it green.

## Product-decision status and M1

`docs/product-decisions.md` remains authoritative:

- D-03 and D-04: APPROVED exact matcher contracts; implemented in PR #3.
- D-05: APPROVED preservation direction only; implementation not authorized.
- D-15: APPROVED A1 pilot scope only.
- D-01, D-02, D-06, D-07, D-08, D-09, D-10, and D-11: PROPOSED.

The next recommended M1 slice is session saving and resuming. It requires an
exact D-05/D-10 contract, architecture review, owner authorization, and Tier 1
test-plan review before RED.

This closure does not approve those contracts or new learner behavior.

## Limitations

- The coding account retains repository administration capability.
- Separate GitHub accounts do not prove review by a separate human.
- Completed checks are snapshots; later authorization changes require reruns.
- The checker cannot recover erased history or prove every assertion's meaning.
- Automated accessibility checks are not full WCAG certification.
- Tests do not replace German linguistic review or learner evaluation.
- Cloudflare verification is local compatibility testing, not production deployment.

## Closure checklist

- [x] Engineering foundation merged.
- [x] Required rulesets and check contexts verified.
- [x] CODEOWNER reviewer arrangement installed.
- [x] Governance acknowledgment demonstrated on PR #5.
- [x] Harmless closure PR passes observed checks.
- [x] Missing-review merge block observed.
- [x] Trusted-log artifact observed.
- [x] Frozen-file tamper rejected; probe PR closed without merging.
- [ ] History rewrite rejection output recorded.
- [ ] History deletion rejection output recorded.
- [ ] Updated documentation passes final checks.
- [ ] @Mahmoud44G reviews and approves the final closure revision.
- [ ] PR #8 merges with a merge commit.
- [ ] Resulting main quality run passes.

M0 remains pending closure until the remaining evidence and final review are
complete. Do not describe pending or unexecuted checks as passing.
