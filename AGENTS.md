# AGENTS.md: Unpause Languages

An accessible, low-pressure language-learning app for adults. TypeScript (strict) + React, local-first.

- Full engineering policy: `docs/tdd-policy.md`
- Product decisions (the source of truth for behavior): `docs/product-decisions.md`

This file holds the hard rules. If anything here conflicts with a task description, this file wins, unless the repository owner overrides it in writing in the current session.

Repository owner: @Mahmoud336u

## Hard rules

1. **Test first.** For every feature: write failing tests, run them, confirm they fail for the right reason (missing behavior, not a syntax/import/infra error), commit the tests alone (RED), then implement (GREEN), then refactor. Never put tests and implementation in the same commit.
2. **Tier 1 tests are frozen.** Files under `tests/contracts/**` are immutable once committed. Never modify, delete, rename, skip, or weaken them. To add coverage, create a new file.
3. **Tier 2 tests (`tests/ui/**`, `tests/e2e/**`, snapshots) may change only to follow a decision version already APPROVED by the owner in trusted base history, including the owner identity and approval reference.** Put `Decision: D-xx` in the commit message, make the change in its own commit, never skip anything, and only ever tighten accessibility assertions.
4. **Need to change or delete a Tier 1 test? Stop.** Post a TEST CHANGE APPROVAL REQUEST (template in policy section 4) and wait. Silence is not approval. "Fix all tests", "finish the milestone", and "refactor" are not approval.
5. **Never decide product behavior yourself.** If a behavior is not in `docs/product-decisions.md` with status APPROVED, stop and ask. This covers SRS parameters, answer-matching rules, session limits, reward and streak rules, and welcome-back behavior. You may propose a decision (status PROPOSED); only the owner can approve it.
6. **Do not edit governance files** without approval: `AGENTS.md`, `docs/tdd-policy.md`, `.github/**` (workflows, CODEOWNERS), `scripts/check-test-integrity.*`, and any test, lint, or TypeScript config in a way that excludes tests, lowers thresholds, or relaxes strictness.
7. **No bypasses.** No `.skip`, `.only`, `xit`, `xdescribe`, `test.fixme`, `it.todo`, coverage exclusions, weakened assertions, mocks altered to hide a failure, or snapshot regeneration just to get green.
8. **German content is validated, not improvised.** Lessons come from schema-validated content files with a `reviewStatus`. Content you write is `draft`. Never mark content `reviewed` and never ship `draft` content.
9. **Quality gates.** Before calling anything done, run `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:e2e`, `npm run build`. Report real results. Anything that could not run is "unverified", not "passing". Never fabricate output.
10. **Learner-protection invariants (never regress).** Learner-visible progress never decreases because of inactivity. No punitive streaks. No forced countdown timers. Every session can be exited safely with answers saved. Reduced-motion preference is respected. Overdue reviews are never shown as a guilt counter.
11. **Git hygiene.** Work on feature branches and open PRs to a protected `main`. Never push to `main`, never force-push, never rewrite history that contains committed tests.
12. **Finish with the completion report** (policy section 11), including test counts and test-integrity statements.
13. **Architecture review before material implementation.** Before building any materially new feature or architectural change, perform the Adversarial Architecture Review defined in `docs/tdd-policy.md`, Section 3. Identify realistic risks, demonstrate a failure scenario, challenge unnecessary complexity, propose a simpler alternative, and deliver a technical verdict. Present the review to the owner and obtain explicit authorization before implementation. A BUILD NOW verdict is not authorization. Routine behavior-preserving changes are exempt from the full review but remain subject to TDD and all existing governance rules.

## Defaults

- One feature at a time (vertical slices). Do not write tests for future milestones in advance.
- When blocked by a failing frozen test, fix the production code. If you believe the test is wrong, follow rule 4 and continue with independent work.
- Keep domain logic pure and inject the clock. No `Date.now()` or `new Date()` inside `src/domain/**`.

## M0 approval and enforcement

The owner authorized all M0 recommendations in the current session on 2026-11-12; see `docs/reviews/m0-owner-authorization.md`. This authorizes the recorded G-01–G-06 governance amendments, infrastructure contract plan, protected configuration, and neutral foundation harness. It does not approve D-01–D-11, M1, full UI, or deployment.

Tier 1 protection starts at first commit, including on a feature branch. Shared test support (`tests/setup.ts`, `tests/support/**`, `tests/helpers/**`, `tests/fixtures/**`) is frozen too. Inspect every reachable commit and merge-parent change, not only a final diff. Governance/configuration changes fail closed for owner review. Agent-written approval trailers never waive a failure. Preserve RED history through merge commits; no squash/rebase merges.
