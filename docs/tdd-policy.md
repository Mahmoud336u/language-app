# Unpause Languages: Engineering Policy (Strict TDD, Tiered)

Version 2.1 with owner-authorized M0 enforcement amendments (2026-11-12). Replaces the single-tier "freeze everything" policy. The short version of the rules lives in `AGENTS.md`; this document is the full reference.

## 1. Principle and precedence

Tests are the contract. Production code conforms to tests, never the other way round. Every feature is built test-first.

This policy overrides conflicting instructions elsewhere in a prompt or task description. The only exception is an explicit written instruction from the repository owner in the current session.

**Freeze late, review early.** Protection applies to the tests that encode stable behavior. Before a Tier 1 test is committed, the owner reviews the test plan (section 3, Phase 1). After the RED commit, the test is frozen. The cost of a mistake is paid in review, where it is cheap, not after freezing, where it is expensive.

## 2. Test tiers and protection

| Tier | Location | What it holds | Rule |
|---|---|---|---|
| **1: Frozen contracts** | `tests/contracts/**` (including `tests/contracts/fixtures/**`) | Domain logic (answer matching, scheduler, progress), persistence and migrations, content-schema validation, learner-protection invariants | Immutable after the RED commit. No edits, deletions, renames, skips, or weakened assertions. New coverage goes in **new files** (never append to a frozen file). Changes require owner approval (section 4). |
| **2: Revisable** | `tests/ui/**`, `tests/e2e/**`, visual baselines, accessibility specs | Component behavior, user journeys, accessibility, snapshots | May be revised **only** to follow a recorded design decision. Revision goes in its own commit with the trailer `Decision: D-xx`. Never skipped, never weakened to hide a bug. Accessibility assertions may only be tightened. Snapshot or baseline updates happen in a dedicated commit that the owner reviews. |
| **3: New tests** | Any new file | Additional coverage | Always allowed and encouraged. |

In every tier, the following are forbidden: skipping or disabling tests, replacing meaningful assertions with weak ones, deleting failing tests, changing expected values to match wrong output, altering mocks to hide failures, excluding tests through configuration, and lowering coverage to get green.

Fixtures and expected-output files follow the tier of the tests that use them.

## 3. Workflow: RED, GREEN, REFACTOR, one vertical slice at a time

Work one feature at a time. Do not write tests for features in later milestones in advance; speculative tests get frozen too.

### Preflight: Adversarial Architecture Review

Before implementing a materially new feature or architectural change, the agent MUST perform a skeptical technical review.

**Purpose:** Challenge architectural assumptions, uncover realistic failure mechanisms, reduce unnecessary complexity, and verify that the proposal delivers sufficient learner value.

#### When the review is mandatory

An architecture review is required when a proposal:

- Introduces or changes domain logic, scheduling, answer evaluation, progression, or learning-state semantics.
- Changes persistence, migrations, data ownership, synchronization, or recovery behavior.
- Introduces a new service, dependency, architectural pattern, or major abstraction.
- Could affect privacy, accessibility, user autonomy, or approved learner-protection requirements.
- Has significant uncertainty about feasibility, correctness, maintainability, or user behavior.

Routine styling, documentation, isolated refactoring, and bug fixes that preserve approved behavior do not require a full architecture review. The agent must still respect all existing TDD and governance requirements.

#### Mandatory review methodology

The reviewing agent acts as a skeptical Principal Software Architect and critical technical co-founder.

It MUST:

1. Identify the top 3–5 realistic technical risks, including their triggers, failure mechanisms, user impact, severity, and simplest reasonable mitigations.
2. Demonstrate the simplest plausible production failure through a concrete sequence of events and observable consequences.
3. Ask exactly three consequential questions concerning data flow, state correctness, and learner behavior.
4. Challenge unnecessary abstractions, duplicated state, premature scaling, and unsubstantiated technical assumptions.
5. Propose a lower-complexity implementation that preserves most of the intended learner value.
6. Define three critical behavioral invariants, two adversarial test scenarios, and one learner-facing acceptance criterion.
7. Deliver exactly one verdict: BUILD NOW, SIMPLIFY FIRST, VALIDATE FIRST, DEFER, or REJECT.

The reviewer MUST distinguish confirmed facts from assumptions and predictions. It must not manufacture risks simply to appear skeptical.

#### Approval and implementation boundary

The architecture review is advisory, not authorization.

- The agent MUST present its verdict and reasoning to the repository owner before beginning implementation of a material change.
- Only the repository owner can authorize implementation.
- The agent MUST NOT interpret its own BUILD NOW verdict as permission to proceed.
- Any new or changed product behavior must be recorded as APPROVED in `docs/product-decisions.md` before tests are written.
- If approved behavior requires changes to frozen Tier 1 tests, Section 4 remains mandatory.
- A rejected or deferred proposal must not be implemented without a subsequent explicit owner decision.

#### Review record

The review must be retained in the feature's issue, pull request, or a dedicated architecture-review document.

Record the proposal, significant risks, simpler alternative, verdict, owner decision, and outstanding uncertainties.

Do not create new architectural infrastructure merely to satisfy the documentation process.

#### Separation from TDD

The architecture review determines **whether and how a feature should be built**.

TDD determines **whether its approved implementation is correct**.

The review must occur before the RED phase and must never override protected tests, approved product contracts, or existing quality gates.

**Phase 0: Check decisions.** Every behavior the feature depends on must be APPROVED in `docs/product-decisions.md`. If one is missing or only PROPOSED, stop and ask (section 5).

**Phase 1: Define expected behavior.** Write explicit acceptance criteria: valid inputs, invalid inputs, edge cases, failure scenarios, persistence, and accessibility where applicable. For Tier 1, post the **test plan** (test names plus one line of expected behavior each) and wait for the owner's go-ahead. If the owner is unavailable, proceed only with tests that map one-to-one to APPROVED decisions.

**Phase 2: RED.**
1. Write the tests: happy paths, boundaries, invalid input, failure scenarios, persistence, and user-facing interactions where applicable.
2. Run them before implementing.
3. Verify they fail because the behavior is missing or wrong. A failure from a syntax error, bad import, missing test dependency, or broken infrastructure is not a valid RED.
4. Commit the tests alone: `test(<feature>): RED - <summary>`. The commit body contains the command run and a summary of the failing output.

**Phase 3: GREEN.** Write the minimum production code that satisfies the tests. You may create or modify production code, refactor architecture, fix defects, and add new tests in new files. You may not touch frozen tests. If a frozen test fails, fix the production code. Commit: `feat(<feature>): GREEN - <summary>`.

**Phase 4: REFACTOR.** After everything passes, improve readability and remove complexity without changing behavior. Rerun the full applicable suite. Commit separately: `refactor(<feature>): <summary>`. Tests stay unchanged.

Do not combine RED and GREEN in one commit. The audit trail must show that the tests existed, and failed, before the implementation.

## 4. Changing or deleting protected tests

If you believe a Tier 1 test is wrong, obsolete, or blocking, **stop work on the affected change** and post this request. Do not make the change until the owner explicitly authorizes it.

**TEST CHANGE APPROVAL REQUEST**
- Test file and test name:
- Current expected behavior:
- Proposed expected behavior and exact proposed diff:
- Why the current test is wrong or obsolete, with evidence:
- Product impact:
- Risk of keeping the test / risk of changing it:
- Alternatives that preserve the current test:
- Recommendation: Modify / Replace / Delete

Silence is not approval. A general instruction ("fix all tests", "complete the feature", "refactor the app") is not approval. If the request is rejected, keep the test and keep investigating the production code. If blocked, continue independent work and leave the affected tests unchanged.

**Deletion needs separate, explicit authorization**, and the request must first explain: why the test is no longer valid; whether the requirement it protects still applies; whether the functionality was intentionally removed; whether another test covers the same behavior; the regression risk of deleting; whether modification or replacement would be safer; and why deletion is preferable to fixing the implementation. If approved, preserve the reasoning in the commit message or an ADR. Never delete a test silently.

**Conflicting or impossible tests.** If two Tier 1 tests contradict each other, or a test cannot be satisfied because of a genuine external limitation: identify the exact conflict, give reproducible evidence, explain why production changes cannot resolve it, list the affected requirements, propose alternatives, and request the owner's decision. Do not claim completion while mandatory tests fail.

**Tier 2 revisions** do not need an approval request, but each one needs a `Decision: D-xx` trailer pointing to the recorded design decision that justifies it, and each is listed in the completion report. A Tier 2 change that removes or weakens a user-protecting assertion (keyboard access, labels, no-timer, safe exit) is treated as a Tier 1 change request.

## 5. Product decisions: the agent does not invent behavior

`docs/product-decisions.md` is the source of truth for product behavior. Each decision has a status:

- **PROPOSED**: a recommendation. Not binding. Tests must not be written against it.
- **APPROVED**: confirmed by the owner. Tests may be written against it.
- **REJECTED**: do not implement.

Only the owner changes a status to APPROVED. An agent may open a PR that adds or edits PROPOSED decisions. If a feature needs a behavior that is not APPROVED, stop and ask. Changing an APPROVED decision that has Tier 1 tests behind it is handled as a Tier 1 change request.

## 6. Testing stack and determinism

| Category | Tool |
|---|---|
| Unit and integration tests | Vitest |
| Property-based tests (invariants) | fast-check, run through Vitest |
| Component tests | React Testing Library + user-event |
| End-to-end | Playwright |
| Accessibility | axe-core + Playwright, plus explicit keyboard-navigation tests |
| Type safety | TypeScript strict mode |
| Code quality | ESLint |
| CI | GitHub Actions |
| Mutation testing (after Milestone 1) | Stryker on `src/domain/**`, to find weak frozen tests |

Use current supported package versions, verify compatibility, pin the Node version, and commit the lockfile.

Tests must be deterministic, isolated, and reproducible:
- The clock is injected. Domain code never calls `Date.now()` or `new Date()`.
- Tests run with a fixed timezone, and include day-boundary, DST, and changed-timezone cases.
- Randomness is seeded. No network access. No external service dependencies.

Mutation findings never edit frozen tests. Surviving mutants are answered with **new** test files.

## 7. Required coverage by area

### A. Domain logic (Tier 1, `tests/contracts/`)

**A1. Answer matching** (against D-03 and D-04)
- Correct and incorrect answers, accepted variants, punctuation and whitespace handling.
- Umlaut and ß handling exactly as approved, including negative tests for different words (for example `schon` must not match `schön`).
- Noun capitalization and grammatical case (Kasus) are separate concerns and tested separately.
- Empty, whitespace-only, and malformed answers rejected safely.
- Sentence-arrangement and multiple-choice validation.
- No false accepts. No duplicate scoring of one attempt.
- Correct feedback and explanation returned for each outcome.

**A2. Scheduler** (against D-01, D-02, D-07, tested through the `Scheduler` interface)
- Initial scheduling, correct-answer scheduling, incorrect-answer rescheduling, confidence-based adjustment.
- Due-card selection and exact time boundaries (at, just before, just after the due time).
- Repeated lapses. Overdue handling and the welcome-back session cap.
- Recording the same review twice is idempotent. No duplicate review records.
- Persistence round trip: state after reload equals state before.

**A3. Progress**
- Session counts, answer accuracy, topic statistics, partial-session preservation, resume behavior.
- No double counting. Empty history. No fabricated course or lesson completion.

**A4. Persistence and migration**
- Onboarding choices (level, preferences) persist across reloads. Invalid input rejected. Safe defaults. Editing preferences.
- Schema-versioned storage migrates forward. Corrupted storage is detected, backed up, and recovered from without crashing or silent data loss.

**A5. learner-protection invariants** (property-based where possible)
- For any inactivity duration, learner-visible progress (completed lessons, learned cards, cumulative counters) never decreases.
- No domain state penalizes the learner for time away.
- Welcome-back sessions never exceed the approved cap and never present an overdue "guilt" count.

**A6. Content schema** (against D-09)
- Every lesson file validates against the schema. CEFR filtering is correct. Lesson ordering and prerequisites are valid (no cycles, no missing references).
- A shipping build fails if any `draft` content is included.

### B. Product behavior (Tier 2, `tests/ui/`)
- Onboarding flow (level and preference selection, editing later).
- Course list filtered by CEFR level, course and lesson navigation, lesson completion criteria, accurate progress display.
- Exercise UI, feedback, and explanations.
- Short-session options (item-count based), safe exit with answers saved, resume of an interrupted session.
- No countdown timers anywhere. Reduced-motion preference respected.

### C. Accessibility (Tier 2, tighten-only)
- Full keyboard navigation, visible focus, labeled form controls, accessible button names.
- Accessible error messages, modal focus trap and Escape behavior.
- Automated contrast checks where axe results are reliable.

### D. Critical journey (Tier 2, Playwright)
1. Open the homepage. 2. Begin onboarding. 3. Choose a German level. 4. Select a course. 5. Open a lesson. 6. Answer exercises. 7. Receive feedback. 8. Complete the lesson. 9. Save progress. 10. Reload. 11. Resume learning. 12. Review previous material.

Also cover a mobile viewport and a "returned after a long absence" run using a controlled clock.

### E. Measurement (Tier 2 until stable; milestone 5)
- Metric definitions are computed correctly from local event data.
- Aggregate reporting is opt-in. No field anywhere asks for or stores an ADHD diagnosis (see D-11).

## 8. Milestones

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M0: Foundations** | Repo scaffold, real `package.json` scripts, CI, `AGENTS.md`, integrity check (with its own tests), branch protection docs, product decisions reviewed | CI green on an empty feature; integrity check proven to catch tamper cases |
| **M1: Domain core** | Answer matcher, scheduler (behind interface), progress, persistence and migrations, learner-protection invariants | All Tier 1 contracts green; mutation run reviewed |
| **M2: Content and structure** | Content schema, validation, onboarding, courses and lessons | Schema tests green; owner reviewed the first content set |
| **M3: Session experience** | Exercise UI, feedback, short sessions, safe exit, resume, welcome-back | Tier 2 UI tests green |
| **M4: Accessibility and journey** | Accessibility pass, full Playwright journey, mobile viewport | Journey and axe tests green |
| **M5: Measure and learn** | Local metrics, opt-in aggregate, small user test | Metrics tested; first user-test findings recorded |

## 9. Quality gates

A feature is complete only when: all its acceptance tests pass; all relevant regression tests pass; TypeScript reports no errors; lint passes; the production build succeeds; no protected test was modified without authorization; no test was silently skipped; no required check was disabled.

At every milestone run:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
```

These scripts must execute real checks. Never create a script that only prints success. A test that cannot run because of environment limits is **unverified**, not passing, and is reported as such.

## 10. Repository enforcement

The owner authorized G-01–G-06 from `docs/reviews/m0-architecture-review.md` in the current session. Approval is recorded in `docs/reviews/m0-owner-authorization.md`. Product decisions remain PROPOSED.

**First-commit protection.** Tier 1 files, fixtures, expected outputs, and shared test support are frozen at first commit, including on a feature branch. Inspect every reachable branch commit and each merge-parent change since the trusted merge base. Reject subsequent modifications, deletions, renames, type changes, and delete/re-add sequences. A later revert does not erase a violation. New unchanged files are allowed. Missing or shallow history fails closed. Protect `tests/setup.ts`, `tests/support/**`, `tests/helpers/**`, and `tests/fixtures/**` like contracts.

**Tier 2 provenance.** Revisions require a dedicated commit with `Decision: D-xx` in its final trailer block. The exact decision version must already be APPROVED in trusted base history, with `**Approved by:** @<repository-owner>` and `**Approval reference:** https://github.com/<owner>/<repo>/pull/<number>` (an optional comment anchor is allowed). The owner identity comes from trusted AGENTS.md. An agent-written trailer or PR-local status change is never approval. The decision approval lands separately before dependent revisions. Every revised Tier 2 path and decision is reported. Deletions and reclassification of existing tests fail closed for owner review. Snapshot/baseline changes still need the owner to review the actual diff. Accessibility assertions may only tighten; learner-protection weakening follows §4. Automation checks provenance, not the semantic correctness of an assertion.

**Protected enforcement surface.** Owner review is required for changes to AGENTS.md, this policy, product-decisions.md, `.github/**`, all scripts, package manifests and lockfiles, npm configuration, test/lint/TypeScript/Vite/Playwright/Cloudflare configurations, and the checker's own test/support files. Conservative rejection is preferable to pretending to prove semantic safety. New contract files are allowed but become frozen immediately. Enforcement checks test source for skip/focus/disable patterns; novel dynamic JavaScript still needs human review.

**Trusted inspection.** `test-integrity` uses `pull_request_target` and only checker/gate code from the trusted base. It may fetch objects and read validated commit metadata, trees, and blobs using Git. The approval wrapper may additionally read current PR metadata and conversation comments through GitHub's API using the read-only automatic GitHub token (`contents: read`, `pull-requests: read`). It never checks out PR files, installs PR dependencies, invokes PR actions, runs PR tests, executes hooks, applies filters, invokes external diff drivers, or consumes PR artifacts/caches. Disable hooks, external diff, text conversion, and replacement objects; pass refs/paths as arguments, not shell interpolation. No repository secrets, write permissions, or external services are introduced. Application checks run separately under `pull_request`.

**Preserve history.** Disable squash/rebase merges. Block force-push and deletion on `main` and active feature branches with RED commits. Preserve test-first history through merge commits. A checker cannot reconstruct history erased before it observes it; branch rules and owner review are essential.

**Mechanical bootstrap.** Before the first RED, M0 may install its approved toolchain and create importable behaviorless interfaces. These are setup, not product implementation or passing test evidence. RED must fail meaningful assertions, not imports or infrastructure. M0 infrastructure contracts use the owner-approved engineering test plan without approving unrelated learner behavior. No empty suite, success-only command, hidden exclusion, or disabled check counts as verification.

**Initial trust bootstrap.** Current main has no checker or workflow. The owner must review and merge the first foundation PR after actual quality and tamper-suite results. Its candidate checker is not trusted authority over its own installation. The first PR does not have a functioning base-owned `test-integrity` check; after merge the owner makes that check required and verifies a subsequent PR. A separate `integrity-contracts` check exercises candidate enforcement without pretending to be the trusted check.

**Owner-only exceptions.** A rejected protected change requires the exact §4 request (or exact governance change approval), PR/head, affected paths/diff, reason, and owner approval. The raw checker has no approval/bypass flag and continues to report all findings. A separate trusted wrapper may acknowledge governance-only findings using the protocol below. It cannot acknowledge frozen-test changes, deletions, bypasses, Tier 2 failures, unavailable history, or unknown violation codes. Those still require the existing explicit owner procedure. A trailer never authorizes a change.

**Governance acknowledgment protocol.** The owner from trusted-base `AGENTS.md`
must personally post a new, unedited PR conversation comment with exactly
`/integrity-approve <fingerprint>` and a nonempty `Reason: ...` on the next line.
The SHA-256 fingerprint binds version, repository, PR number, owner, base SHA, head
SHA, and the sorted complete governance findings (code, path, commit). Only the
latest owner integrity-command comment counts. Wrong, malformed, edited, stale,
or revoked commands fail closed. `/integrity-revoke <fingerprint>` withdraws the
acknowledgment on the next run. The wrapper obtains authorship from GitHub, reads
all bounded comment pages, rechecks current PR/base/head around evidence loading,
and records the comment ID/URL, reason, fingerprint, and original findings. API
errors or inspection limits fail closed. Bots and agent-written evidence do not
authorize exceptions; the coding identity must remain distinct from the owner.

An ordinary PR review approval does not trigger or satisfy this protocol. The
owner/reviewer reruns the trusted check after the comment. Completed checks are
snapshots: later edits, deletion, or revocation do not retroactively invalidate
them. Rerun and inspect the approval timeline before merging; prefer a new revoke
command over editing/deleting evidence. No status/check-writing permission or
comment-triggered workflow is introduced.

**Gate installation.** A gate cannot authorize its own installation or upgrade
using candidate code. The owner may use the existing narrowly scoped administrative
exception after reviewing the exact PR/head/diff and real quality results; record
`Test-Change-Approved: PR #<n>` as an audit pointer. Never disable the required check
globally. The owner controls this exception and merge; an agent must not perform
them. Ordinary quality gates still have to pass. Verify the new gate on fresh
events after its code enters the trusted base; old-run reruns retain old code.

**Owner-managed GitHub settings.** Protect main with PRs and required `lint`, `typecheck`, `test:run`, `test:e2e`, `build`, `test-integrity`, plus the approved `integrity-contracts` and `deployment-compatibility` checks. Confirm private-repository plan support. The coding identity must be separate, non-admin, with contents/PR writes only and no bypass/status-forging authority. Bind status sources where supported. CODEOWNERS lists governance and enforcement paths; require reviews only with a separate eligible owner reviewer. Never rely on bot self-approval. See `docs/ci.md` for the manual checklist and limitations.

## 11. Completion report (every milestone)

**Architecture review:** Required / Exempt; review location; verdict; owner authorization; approved design decisions; unresolved risks.

**Implementation summary:** features implemented, files changed, tests added.

**TDD evidence:** RED (failing results before implementation), GREEN (passing results after), REFACTOR (passing results after improvements). Include the commit hashes.

**Verification results** with actual counts and command output: unit, integration, E2E, accessibility, TypeScript, lint, build, each marked passed / failed / unverified. Include mutation-testing results from M1 onward.

**Test integrity:** Tier 1 tests modified without approval (must be 0); tests deleted without approval (0); tests skipped to bypass a failure (0); unauthorized expected-output changes (0); Tier 2 revisions made, each with its decision ID.

**Open items:** PROPOSED decisions still blocking work, unverified checks, and any approval requests awaiting the owner.

Never fabricate a passing result.

## 12. Final directive

Acceptance tests are the contract and production code is the implementation. Never change the contract because the implementation falls short. Do not rewrite tests to turn the pipeline green, remove difficult tests, hide failures, weaken assertions, or silently regenerate snapshots. If a protected test is genuinely wrong, explain why and ask first.

The goal is not green tests. The goal is a correct, reliable, maintainable app whose behavior is independently verified and which actually helps people come back and keep learning.
