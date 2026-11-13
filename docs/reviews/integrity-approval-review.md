# Scoped owner approval for trusted integrity findings

## Problem and authority

The trusted check rejects every protected configuration/governance change, even
when the owner has authorized it. PR #2 failed on `docs/product-decisions.md`;
PR #3 failed on test-tool dependencies and configuration. The raw findings were
correct, but there was no machine-verifiable owner exception.

The owner requested: “create a fix ... with explanations in a new PR ... someone
else will review it.” This authorizes preparing and testing this separate fix for
review, not merging it, approving it as the owner, or changing GitHub rules. The
proposed policy amendment becomes effective only after owner acceptance and merge.
No product decision, learner behavior, or existing frozen contract is changed.

## Architecture review

Keep `inspectRepository` and its CLI unchanged. Add a separate, dependency-free
gate that reads authenticated GitHub PR comments with a read-only token. Only
`GOVERNANCE_CHANGE` findings may receive an owner acknowledgment. All other
violations remain blocking, including frozen tests, deletion, Tier 2 provenance,
disabled tests, and unavailable history.

The check prints a SHA-256 fingerprint of the repository, PR number, trusted owner,
base SHA, head SHA, and sorted complete governance findings (code/path/commit).
After reviewing that exact change/history, the owner posts a new PR conversation
comment consisting of `/integrity-approve <fingerprint>` followed by a nonempty
`Reason: ...` line, then reruns the trusted check. An ordinary review badge alone
is insufficient. A separate person may review; authorization remains with the
owner named in trusted `AGENTS.md`. The agent must never post the approval itself.

Only the latest owner integrity-command comment counts. Edits, malformed commands,
stale fingerprints, bot authors, or `/integrity-revoke <fingerprint>` block approval.
Unrelated discussion is ignored. The gate reads all comment pages within a bounded
limit and verifies the PR/base/head before and after reading approval evidence.
It records the approval comment URL/ID and reason together with the raw findings.

| Risk | Trigger and failure mechanism | Impact / severity | Mitigation |
| --- | --- | --- | --- |
| Forged approval | A contributor adds an approval trailer, quoted comment, or fake identity to PR code | Unauthorized enforcement change / high | Accept API-authenticated human owner only; identity from trusted base; never PR files |
| Replayed approval | New commit, base change, different PR, or changed protected history reuses a prior approval | Unreviewed changes accepted / high | Fingerprint every binding and finding; verify current PR twice; latest command wins |
| Broad exception | Governance approval accidentally suppresses a frozen-test violation | Learning contracts can regress / high | Raw checker untouched; any non-governance violation blocks regardless of approval |
| Execution boundary | Approval workflow installs or executes candidate code with a token | Repository integrity compromised / high | Base-only checkout, no dependencies/artifacts/caches, no write permission, no PR code execution |
| Stale check after revocation | Owner revokes/deletes approval after a completed successful run | Old success remains visible / medium | Explicit rerun required; owner must rerun before merge; document snapshot semantics and separate reviewer/credential controls |

Concrete failure scenario: the owner approves configuration at head A; a contributor
pushes B that also weakens a contract. A fingerprint from A cannot authorize B,
and the contract violation remains blocking even with a fresh governance approval.

Exactly three consequential review questions, with proposed answers:

1. Where may approval evidence enter the gate? Only authenticated GitHub PR comments
   read by base-owned code, with owner identity obtained from the trusted base.
2. What invalidates approval state? Any binding/finding change, latest command
   revocation or edit, stale PR metadata, malformed evidence, or API failure.
3. Can authorization permit a learner-protecting contract to weaken? No; this path
   handles governance findings only. Existing protected-test requests remain separate.

Lower-complexity alternative: retain the existing owner administrative bypass.
It avoids API integration but leaves legitimate changes permanently red and places
more responsibility on manual merge controls. The proposed gate uses a manual
rerun rather than review/comment-triggered workflows or writable check/status APIs.

Three invariants:

1. Non-governance violations are never cleared by this approval path.
2. An approval authorizes only its exact repository/PR/base/head/findings fingerprint.
3. Inspection and approval validation never execute candidate code or write GitHub state.

Two adversarial scenarios: replay an owner approval after a push/base change;
combine a valid governance acknowledgment with a frozen-test violation.

Learner-facing acceptance criterion: approving a legitimate CI/configuration change
cannot authorize weakened learning or learner-protection tests.

Technical verdict: **BUILD NOW**, within the owner's request to prepare a reviewed
fix. This is a recommendation, not approval of the final diff or authority to merge.

## Test plan before RED

New files only; existing frozen tests remain byte-for-byte unchanged.

- Exact owner acknowledgment clears governance-only findings and retains audit evidence.
- Clean inspection succeeds without manufacturing an approval requirement.
- Each non-governance violation and a mixed violation set stays blocked.
- Every fingerprint binding and finding changes authorization; finding order does not.
- Missing, stale, malformed, edited, bot, non-owner, or revoked evidence blocks.
- Later unrelated discussion does not erase approval; latest integrity command wins.
- Comments are paginated completely, including revocation on later pages.
- PR changes during inspection, unavailable API, invalid response, or page limits fail closed.
- The HTTP client uses fixed GitHub endpoints, GET only, no redirects, and a bounded timeout.
- The runner obtains owner identity from Git objects; the raw checker still rejects
  protected changes and frozen-test tampering independently of the wrapper.

## Installation boundary

This PR must not approve itself. The existing base-owned workflow will still reject
its protected changes. The reviewer/owner must use the existing documented scoped
bootstrap exception if branch rules require it, preserving the RED/GREEN history.
After merge, open a fresh governance-only PR and verify approval/rerun behavior;
also verify a tamper PR stays blocked. A rerun of a pre-installation workflow uses
its old trusted code and is not proof the new gate is active. Do not disable the
required check or merge deliberately tampered tests.
