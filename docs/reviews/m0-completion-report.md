# M0 implementation and verification report

Date: 2026-11-13. Repository: `Mahmoud336u/language-app`.
Branch: `m0/engineering-foundations`. Application: **Unpause Languages**.
Pull request: [#1](https://github.com/Mahmoud336u/language-app/pull/1), draft.

**Status: implementation ready for owner review; M0 exit criteria are not yet fully
verified.** Local application and tamper-suite checks pass, as do all seven GitHub
quality jobs. Owner-managed enforcement remains outstanding. Nothing has been deployed.

## Architecture and authorization

Architecture review was required and is retained in
[m0-architecture-review.md](m0-architecture-review.md). Its advisory verdict was
**SIMPLIFY FIRST**. The owner subsequently authorized all M0 recommendations and
confirmed use of `language-app`; see [the authorization](m0-owner-authorization.md).
This covers the proposed engineering contract plan, G-01–G-06 amendments, protected
foundation configuration, and neutral visual harness. It does not approve learner
behavior. D-01–D-11 remain **PROPOSED**, byte-for-byte identical to the supplied file.

The approved simplification uses strict TypeScript, React/Vite static assets, local
test tooling, and no server runtime or external infrastructure. No persistence,
answer matcher, scheduler, curriculum, onboarding, AI, accounts, or learning progress
has been implemented. Local storage and recovery semantics remain subject to D-10.

## Implementation

- Pinned Node/npm and compatible dependency versions, lockfile, strict TypeScript,
  real scripts, lint rules, Vitest, Testing Library, fast-check, Playwright, and axe.
- Standalone Git-object integrity inspection: first-commit freezing, all reachable
  history and merge parents, restore/delete/rename attacks, trusted Tier 2 owner
  provenance, dedicated revision commits, and protected configuration rejection.
- Separate candidate quality workflows and trusted-base inspection workflow, pinned
  actions, read-only permissions, CODEOWNERS, and PR reporting template.
- Neutral responsive component harness, original tokens/illustration, validation,
  keyboard access, focus, reduced motion, error feedback, and honest availability.
- Static Cloudflare-compatible entries, real missing-asset 404s, restrictive headers,
  and local compatibility checks. No global SPA fallback masks missing assets.
- Setup, architecture, testing, design, content-review, deployment, CI, and owner
  setup documentation. No old Lovable code or reference-site assets imported.

Deployment specs are classified as Tier 2 browser tests. A new contract file covers
their approval and revision audit requirements; no original contract was edited.
The deployment runner discovers the whole deployment test directory, rather than
restricting discovery to the first spec filename. A missing decorative arrow glyph
found during visual inspection was replaced with an aria-hidden SVG.

## TDD evidence

Commit bodies preserve commands and observed results. RED commits contain tests
alone; the mechanical bootstrap provided importable non-passing seams first.

| Slice | RED | GREEN |
| --- | --- | --- |
| History integrity | `d051760`: 56 failed with missing behavior, fixtures/imports running | `cedc622`: 56 passed |
| Neutral harness | `07a2dfb`: 3 UI failures and 14 browser failures; 56 contracts passed | `0e207d5`: 3 UI and 14 browser tests passed |
| Static deployment | `6df257c`: 4 failed, 2 passed; missing assets returned 200 and headers were absent | `ae60e22`: all 6 passed |
| Deployment-test provenance | `4fd957f`: 3 new failures, 56 existing contracts passed | `e6e77b6`: all 59 integrity contracts passed |

REFACTOR: `679bf65` extracted the sample form from page composition. Lint, typecheck,
build, 59 then-existing unit/integration tests, and 14 browser tests passed afterward.
The later three provenance tests bring the current Vitest total to 62.
No unnecessary checker refactor was made after its focused classification fix.

The UI and deployment RED commits both preceded their implementations; deployment
was tested against the built harness baseline. The history retains that ordering
instead of rewriting it into an artificial sequence.

## Local verification

Environment: Linux, Node 24.22.1, npm 11.9.0, UTC, system Chromium at
`/usr/bin/chromium`. CI installs the Chromium version pinned by Playwright; that
environment must report its own result. A fresh `npm ci` completed successfully
(`added 239 packages in 8s`). The final application verification followed that install.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | PASSED | ESLint exited 0 with max warnings 0 |
| `npm run typecheck` | PASSED | `tsc --noEmit` exited 0 |
| `npm run test:run` | PASSED | `Test Files 3 passed (3)`; `Tests 62 passed (62)` |
| `npm run test:integrity` | PASSED | `Test Files 2 passed (2)`; `Tests 59 passed (59)` |
| `npm run build` | PASSED | Vite built 17 modules; JS 223.93 kB / 70.09 kB gzip |
| `npm run test:e2e` | PASSED | `14 passed (22.1s)` after final visual correction |
| `npm run test:deployment` | PASSED | `6 passed (10.4s)` after final UI changes |
| Workflow YAML / whitespace | PASSED | Both workflows parsed; `git diff --check` clean |
| Manual foundation inspection | PASSED within scope | Desktop/mobile screenshots reviewed; missing glyph corrected |
| Mutation testing | NOT APPLICABLE | Begins with M1; no domain implementation exists |

The 59 integrity tests are a subset of the 62 Vitest tests, not additional tests.
Three component tests cover honest availability, sample interaction, and accessible
validation. Browser tests include two viewport runs of keyboard focus, reduced
motion, error announcements, 200% text reflow, navigation, and axe scans in initial
and error states. Automated accessibility results are not a full WCAG certification
or manual screen-reader audit. Deployment evidence is local Wrangler, not production.

## Test integrity and enforcement status

- Unauthorized Tier 1 modifications: **0**.
- Unauthorized test deletions: **0**.
- Tests skipped to bypass a failure: **0**.
- Unauthorized expected-output changes: **0**.
- Tier 2 revisions: **0**; no product-decision trailer was used to alter existing tests.
- New tests: two contract files, one component file, one E2E file, one deployment file.

`npm run check:test-integrity` against the original `origin/main` returns **failure
for protected governance/configuration changes**, as designed. It must not be
reported as green or weakened to approve its own bootstrap. The candidate tamper
suite proves the tested failure mechanisms; it is not trusted approval of this PR.
The original main has no checker/workflow, so a base-owned `test-integrity` result
cannot exist for this initial installation. The owner must review and merge it.

GitHub Actions execution: **PASSED** for implementation commit
`1066fb41c6173ace484b23a1b25e5e26a60aac90` in
[Quality gates run 43347686525](https://github.com/Mahmoud336u/language-app/actions/runs/43347686525).
All seven jobs completed successfully: `lint`, `typecheck`, `test:run`, `build`,
`integrity-contracts`, `test:e2e`, and `deployment-compatibility`. This verifies the
clean GitHub runner and pinned Playwright browser as well as the local environment.
It does not verify a base-owned `test-integrity` job, which has not run at bootstrap.
The candidate history audit at that implementation commit inspected 12 commits,
reported 25 `GOVERNANCE_CHANGE` findings, and reported no frozen-test, deletion,
bypass, or Tier 2 revision findings. This report update changes documentation only.

Required-check settings, branch protection, private-plan support, and a separate non-admin coding
identity are **unverified/not configured by this agent**. Connector metadata exposed
admin capability; a local Codex commit author does not create role separation.

## Remaining owner-controlled exit criteria

Follow [the exact CI setup checklist](../ci.md). In particular:

1. Review the bootstrap changes and merge with the RED/GREEN/REFACTOR commits intact.
2. Configure a separate non-admin coding identity and an eligible independent owner
   reviewer; do not rely on bot self-approval.
3. Confirm private-repository plan support and protect main and unmerged RED history.
   Require the actual quality contexts and the base-owned integrity context once it
   exists. Disable force-push and squash/rebase merging as documented.
4. Verify a subsequent harmless PR and disposable tamper PR, recording trusted job
   origin and blocked merging. Never merge the tamper PR.

These are genuine outstanding milestone requirements, not passing checks. Do not
claim M0 complete or the application production-ready before they are verified.
No admin bypass, settings change, merge, or external provisioning was performed.

## Next work remains gated

The proposed first M1 slice is deterministic German answer matching. It needs
explicit D-03/D-04 approval with exact normalization, transliteration, punctuation,
capitalization, malformed-input, and feedback rules, plus the owner's Tier 1 plan
review. D-01/D-02/D-07 scheduling, D-05/D-10 state/persistence, D-09 content review,
and D-11 measurement remain deferred to their own approved slices. The supplied
architecture review records the unresolved definitions; none were silently chosen.
