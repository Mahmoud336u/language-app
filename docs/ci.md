# CI and integrity enforcement

## Two trust boundaries

`quality.yml` uses `pull_request` to execute candidate code with read-only repository
permissions and no credentials retained by checkout. It runs real lint, TypeScript,
unit/integration, browser, build, integrity-fixture, and local deployment checks.
Actions are pinned to verified commit SHAs. Tests use UTC, seeded properties, local
fixtures, and local assets. No paid service is required.

`test-integrity.yml` uses `pull_request_target`. It checks out **only the trusted
base SHA**, fetches PR Git objects without checking them out, verifies the exact
head SHA, and runs the base-owned standalone checker with Node. No npm install,
PR dependencies, PR actions, test execution, cache restore, or PR artifacts enter
this job. A temporary askpass helper supplies the read-only GitHub token only to
fetch; the subsequent inspection step has no token variable. Git hooks, external
diff/textconv, and replacement objects are disabled by the checker.

The checker examines every reachable commit and each merge-parent delta since the
merge base. Contracts and shared support freeze at first commit. It catches changes
even if restored later. It reports Tier 2 revisions with their trusted owner-approved
decision ID and requires dedicated revision commits. Test deletion and governance
changes fail closed. It has no bypass or approval flag.

## Initial bootstrap and protected changes

The original main contains only README and LICENSE. A trusted checker cannot approve
its own first installation. `integrity-contracts` verifies candidate enforcement;
it deliberately does not impersonate `test-integrity`. The owner must inspect and
merge this initial PR, preserving its separate RED/GREEN/REFACTOR commits. Only then
can a subsequent PR demonstrate the trusted check and the owner make it required.

`npm run check:test-integrity` on the bootstrap branch correctly reports protected
configuration/governance additions. Such findings do not mean the tamper suite
failed, and a passing tamper suite does not mean this PR's governance changes are
automatically authorized by code. The owner's recorded approval and merge are the
bootstrap trust decision. Do not weaken the checker to obtain a green bootstrap.

Subsequent protected changes need an exact owner-reviewed request, paths/diff,
approval reference, PR/head SHA, and reason. The owner controls any scoped ruleset
bypass. `Test-Change-Approved: PR #n` is an audit pointer, never an executable waiver.
All ordinary quality gates must still pass.

## Owner setup checklist — not configured by this agent

1. Confirm the GitHub plan supports enforcement for this private repository.
2. Replace the admin-capable connector identity with a separate non-admin coding
   identity. Grant contents and PR write only; no administration, bypass, or
   check/status-forging authority. Local Git commits use the Codex author identity;
   a Git author string is not authentication or proof of role separation.
3. In Settings → Rules → Rulesets (or branch protection), require PRs into `main`,
   block force-push/deletion, and require current successful checks. Select actual
   emitted contexts: `lint`, `typecheck`, `test:run`, `test:e2e`, `build`,
   `integrity-contracts`, `deployment-compatibility`, and, after bootstrap,
   `test-integrity`. Bind expected status sources where supported.
4. Protect active feature branches containing RED commits against force-push and
   deletion until history is retained on main. Disable squash/rebase merging;
   preserve commits with merge commits. Do not enable conflicting linear-history
   requirements. Normal branch deletion after its commits are retained is distinct
   from erasing unmerged RED history.
5. Restrict any bypass to the owner and approved PR scope. The coding identity must
   not bypass its own check. The owner, not this agent, merges the bootstrap.
6. Review CODEOWNERS. Enforce owner review with a separate eligible owner reviewer;
   a sole PR author cannot approve their own PR. Do not use bot self-approval.
7. After merge, open an independent harmless PR and a disposable tamper PR to verify
   check origin, required contexts, first-commit protection, and merge blocking.
   Never merge the tamper PR. Record actual rule/check evidence before closing M0.

## Honest limits

This is repository-level protection, not an adversarial sandbox against its owner.
An admin can bypass rules. A checker cannot recover history erased before observation,
prove that Git author metadata represents a person, or prove every assertion's
meaning. Lexical detection catches supported skip/focus forms, not arbitrary
metaprogramming. Human review is still required for semantic weakening, generated
tests, accessibility changes, and snapshot correctness. The script fails closed on
shallow/unavailable history, oversized source, and inspection resource limits.

Candidate workflows can be changed in a PR, but the trusted integrity job rejects
those changes and never uses them to judge itself. Required check names alone are
not a security boundary without branch rules and restricted coding credentials.
