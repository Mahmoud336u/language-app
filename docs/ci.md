# CI and integrity enforcement

Last reviewed: 2026-11-14.
Repository: `Mahmoud336u/language-app` (public).

## Account roles and owner-authorized exception

The repository owner explicitly selected this arrangement in the development
conversation:

| Responsibility | Account |
| --- | --- |
| Repository ownership, coding, pushing branches, opening normal PRs | @Mahmoud336u |
| Reviewing and approving normal PRs, merging after requirements pass | @Mahmoud44G |
| Personally authorizing governance-only integrity findings | @Mahmoud336u |

CODEOWNERS delegates review of protected paths to @Mahmoud44G. It does not
delegate product-decision approval, linguistic review, protected-test exceptions,
or the `/integrity-approve` command.

The owner chose to retain an admin-capable coding account instead of adopting the
earlier non-admin coding recommendation. This is an explicit owner-authorized
exception to that account-isolation requirement. Other governance remains in force.

This arrangement separates GitHub author and reviewer identities, but it does not
remove the coding account's administrative capability or prove review by a
different human. An administrator can change repository protections. Agents must
not change protections, bypass checks, approve their own changes, or post an
integrity authorization on the owner's behalf.

The current rulesets have no bypass actors configured.

## Two trust boundaries

`.github/workflows/quality.yml` runs candidate code under `pull_request`, using
read-only repository permissions and no credentials retained by checkout. It
executes lint, TypeScript, unit/integration, browser, build, contract, deployment
compatibility, and mutation checks.

Actions are pinned to commit SHAs. Tests use UTC, deterministic fixtures, and
seeded properties where applicable. No paid service is required.

`.github/workflows/test-integrity.yml` uses `pull_request_target`. It checks out
only the trusted base SHA, fetches PR Git objects without checking out candidate
files, verifies the exact head SHA, and runs base-owned inspection code.

The trusted job does not install PR dependencies, execute PR tests or actions,
restore PR caches, or consume PR artifacts. Git hooks, external diff/text
conversion, and replacement objects are disabled by the checker.

A temporary askpass helper supplies the read-only automatic GitHub token for
fetching objects. The approval wrapper uses that token only for GET requests to
GitHub PR metadata and conversation comments. Permissions are `contents: read`
and `pull-requests: read`; no repository secrets or write permissions are needed.

## Integrity inspection

The raw checker:

- Inspects every reachable branch commit and merge-parent change since the
  trusted merge base.
- Freezes Tier 1 files and shared test support at their first commit, including
  commits made on a feature branch.
- Detects modifications, deletions, renames, and changes later restored by another
  commit.
- Requires Tier 2 revisions to reference a decision version already approved in
  trusted base history, with owner identity, approval reference, and a dedicated
  revision commit.
- Reports protected governance and enforcement changes.
- Fails closed when history or required inspection data is unavailable.
- Has no approval or bypass flag.

The separate trusted wrapper can acknowledge only `GOVERNANCE_CHANGE` findings.
Frozen-test changes, deletions, bypasses, Tier 2 failures, unavailable history, and
unknown violation codes remain blocking.

`npm run check:test-integrity` remains a raw local audit. It still reports
protected governance changes even when the trusted wrapper has accepted a human
authorization. Its result must not be misreported as a clean audit.

## Required GitHub protections

The following settings were verified through GitHub's API on 2026-11-14.

### Main ruleset

Ruleset: `main-quality-and-review`, ID `27225437`.

- Enforcement: Active.
- Target: default branch.
- Bypass actors: none.
- Block deletion and non-fast-forward updates.
- Require a pull request.
- Require one approving review.
- Require CODEOWNER review.
- Dismiss stale approvals after new reviewable commits.
- Require approval of the most recent reviewable push.
- Require resolution of review conversations.
- Allowed merge method: merge commit.
- Require the branch to be up to date before merging.

Required check contexts, bound to the GitHub Actions integration:

- `lint`
- `typecheck`
- `test:run`
- `test:e2e`
- `build`
- `integrity-contracts`
- `deployment-compatibility`
- `mutation`
- `test-integrity`

`mutation` is present because the approved M1 answer matcher is already merged.

### Feature-history ruleset

Ruleset: `feature-branch history ruleset`, ID `27225932`.

- Enforcement: Active.
- Include all branches.
- Exclude `refs/heads/main`, which has its own protections.
- Bypass actors: none.
- Block deletion.
- Block non-fast-forward updates.

The current feature ruleset also blocks deletion after a branch is merged.
Do not assume GitHub's branch-cleanup action will be permitted. Any later
retention-policy change requires owner review and must preserve committed history.

Preserve RED/GREEN/REFACTOR commits through merge commits. Do not squash, rebase,
force-push, or rewrite committed test history.

API configuration checks establish the saved settings. Live rejection evidence
is recorded separately in `docs/reviews/m0-live-verification.md`.

## Authorizing a governance-only change

1. Review the full PR diff, historical findings, affected paths, and exact
   base/head. Confirm ordinary quality checks pass.
2. Open the latest `Trusted test integrity / test-integrity` run.
3. If the decision is `approval-required`, copy the complete fingerprint from
   that run.
4. As @Mahmoud336u, personally post a new ordinary PR Conversation comment using
   exactly two lines:

   ```text
   /integrity-approve <64-character fingerprint from the current run>
   Reason: <specific reason for accepting these exact protected changes>
   ```

5. Use the ordinary comment box at the bottom of the Conversation tab.
   Review submissions and inline review comments are not read by the gate.
6. On that same current Actions run, select Re-run jobs → Re-run failed jobs.
7. Confirm the decision becomes `owner-approved`, with the expected owner
   comment URL/ID and unchanged raw findings.
8. Obtain the separate required GitHub review from @Mahmoud44G before merging.

Posting a comment does not automatically rerun the workflow. An ordinary GitHub
Approve review does not satisfy the integrity acknowledgment protocol.

The fingerprint binds repository, PR number, owner, base SHA, head SHA, and the
complete sorted governance findings. It cannot be reused on another PR or after
relevant metadata or findings change.

Only the latest owner integrity-command comment counts. It must be unedited.
Wrong, stale, malformed, edited, or revoked evidence fails closed.

To revoke authorization, the owner posts a new ordinary Conversation comment:

```text
/integrity-revoke <fingerprint>
```

Then rerun the trusted check. A subsequent fresh approval may supersede it.

Completed checks are snapshots. Later edits, deletion, or revocation do not
retroactively change an existing green result. Inspect the approval timeline and
rerun when authorization changes.

The GitHub client uses a fixed API origin, GET-only endpoints, rejects redirects,
limits responses to 1 MiB, applies a 15-second request timeout, and reads at most
20 pages of 100 comments. A full final page fails closed. PR identity, open state,
and base/head are checked before and after loading evidence. API errors cannot
produce success. The job timeout is 10 minutes.

## Logs and artifacts

The trusted workflow:

- Prints the inspection and approval decision in its job log.
- Includes the complete output in the job summary.
- Uploads `test-integrity-log` with a 14-day retention period.
- Preserves the checker's exit status when capturing its output.

Read the current run's output. Logs from an older head/base do not establish
authorization for a newer change.

The mutation job uploads JSON/HTML reports for 14 days. Review surviving mutants
alongside the score; a high score alone does not prove correctness.

For longer-term evidence, retain relevant output or screenshots with the
verification record before Actions artifacts expire. Do not commit credentials,
tokens, or sensitive runner data.

## Bootstrap and gate upgrades

The original repository contained README and LICENSE but no trusted checker.
PR #1 installed the engineering foundation; PR #4 installed the owner
acknowledgment wrapper; PR #5 added trusted-log visibility; PR #7 transferred
protected-path review to @Mahmoud44G.

A gate cannot judge its own installation using candidate code. Changes are
evaluated by the implementation already present in the trusted base.

An old workflow rerun retains its original workflow/base context. Verify upgrades
on fresh events after installation. Incorporate updated main through merge
commits before generating new approval evidence.

A commit trailer such as `Test-Change-Approved: PR #n` is an audit pointer, never
an executable waiver. Required checks must not be globally disabled to install
or update enforcement.

## Live verification

See `docs/reviews/m0-live-verification.md` for:

- A harmless PR with successful checks.
- Merge blocking while an eligible approving review is missing.
- Trusted-log output and artifact verification.
- A disposable frozen-file tamper PR that must never merge.
- Actual feature-branch rewrite and deletion rejection evidence.
- Final review and closure status.

Owner authorization to conduct a negative test does not mean that the gate should
accept its deliberately prohibited change. A blocked disposable tamper PR is the
expected result.

## Limitations

Repository-level protections are not a security boundary against the repository
administrator. The retained admin-capable coding account can change settings.

Separate GitHub accounts and Git author strings do not prove independent human
review. Required check names and source bindings alone do not establish the
semantic correctness of a workflow or assertion.

The checker cannot recover history erased before observation. Lexical detection
covers supported skip/focus patterns, not arbitrary JavaScript metaprogramming.
Human review remains necessary for assertion weakening, accessibility changes,
snapshots, content correctness, and enforcement changes.

Automated tests, mutation testing, and local Cloudflare compatibility checks do
not establish production readiness, full accessibility conformance, or linguistic
accuracy.
