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
this job. A temporary askpass helper supplies the read-only GitHub token to fetch.
The subsequent base-owned approval wrapper uses the automatic token only for GET
requests to PR metadata and conversation comments. It has `contents: read` and
`pull-requests: read`, no repository secrets or write permissions. Git hooks, external
diff/textconv, and replacement objects are disabled by the checker.

The checker examines every reachable commit and each merge-parent delta since the
merge base. Contracts and shared support freeze at first commit. It catches changes
even if restored later. It reports Tier 2 revisions with their trusted owner-approved
decision ID and requires dedicated revision commits. Test deletion and governance
changes remain in the raw findings. The raw checker has no bypass or approval flag.
The wrapper can acknowledge governance-only findings with exact authenticated owner
evidence; all other violation codes remain blocking. It never changes raw results.

## Reviewing and authorizing a protected change

1. Review the PR's full diff and historical findings. A second person can review
   the code; only the owner identified in trusted `AGENTS.md` can authorize the
   governance exception. Confirm all ordinary quality checks pass.
2. Open the current `Trusted test integrity / test-integrity` run and its
   `test-integrity-log` artifact (the job summary also includes the complete
   output). If it reports `approval-required`, copy its complete fingerprint and
   review the listed paths and commits. The fingerprint changes with PR, base/head,
   owner, or findings.
3. The owner personally posts a **new PR conversation comment**, with exactly two
   lines (replace both placeholders):

   ```text
   /integrity-approve <64-character fingerprint from the current run>
   Reason: <why these exact protected changes are accepted>
   ```

4. On that Actions run, use **Re-run failed jobs**. Approval does not automatically
   trigger a workflow; an ordinary **Approve** review is not sufficient. The new
   run fetches current authenticated comments rather than trusting stored files,
   trailers, PR text, labels, or an agent's assertion of approval.
5. Confirm `owner-approved`, the actual owner comment URL/ID, matching fingerprint,
   unchanged raw governance findings, and successful ordinary checks before merge.
   Preserve RED/GREEN commits with a merge commit.

Only the latest owner integrity-command comment counts. It must be unedited and
match the exact fingerprint. A new `/integrity-revoke <fingerprint>` comment revokes
authorization when the check is rerun. A fresh approval comment can supersede it.
Edits, deletion, and revocation after a completed check do not retroactively change
its status: rerun and inspect the timeline before merge. Do not edit/delete approval
records as a replacement for an explicit revocation.

The client uses a fixed GitHub API origin, GET-only endpoints, rejects redirects,
limits each response to 1 MiB, applies a 15-second request timeout, and reads at most
20 pages of 100 comments (a full last page fails closed). It checks PR identity,
open state, and base/head before and after loading evidence. API failure cannot
produce a passing result. The gate's 10-minute job timeout remains in effect.

`npm run check:test-integrity` remains a raw local audit and still fails on protected
changes, including approved ones. That behavior is intentional and its frozen tests
are unchanged. The workflow prints both `inspection` and `decision` so a passing
owner-authorized gate never conceals its underlying findings.

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
approval reference, PR/head SHA, and reason. Governance-only changes can use the
protocol above once the wrapper is in the trusted base. The installation PR is
still judged by the old base-owned checker and will remain red for protected
changes. The owner controls any scoped ruleset exception for that installation;
the agent cannot authorize or merge it. `Test-Change-Approved: PR #n` is an audit
pointer, never an executable waiver. All ordinary quality gates must still pass.

After installation, test a fresh governance-only PR without approval, with valid
approval and a rerun, and after a new head commit. Also test a frozen-test tamper PR
and verify that approval never clears it. Do not merge the tamper PR. An old run
rerun retains its original workflow/base code: trigger a fresh event using current
base metadata after installation. Base retargeting is covered by `edited`; feature
branches must incorporate updated main with merge commits, not rebase frozen history.

## Owner setup checklist — not configured by this agent

1. Confirm the GitHub plan supports enforcement for this private repository.
2. Replace the admin-capable connector identity with a separate non-admin coding
   identity. Grant contents and PR write only; no administration, bypass, or
   check/status-forging authority. Local Git commits use the Codex author identity;
   a Git author string is not authentication or proof of role separation.
3. In Settings → Rules → Rulesets (or branch protection), require PRs into `main`,
   block force-push/deletion, and require current successful checks. Select actual
   emitted contexts: `lint`, `typecheck`, `test:run`, `test:e2e`, `build`,
   `integrity-contracts`, `deployment-compatibility`, `mutation` for M1 domain work, and, after bootstrap,
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

The M1 `mutation` job uses the same read-only/pinned setup and uploads JSON/HTML
reports for 14 days. It mutates all domain TypeScript and does not relax the full
test suite. Its score must be accompanied by a review of surviving mutants. Adding
it as a required context is an owner-managed repository setting, not established
merely by committing the workflow.
