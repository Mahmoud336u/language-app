# Integrity approval fix — reviewer handoff

## Problem and result

Legitimate protected changes always failed `Trusted test integrity / test-integrity`,
even after the owner accepted them. The raw checker correctly identified the
protected files; it had no authenticated approval path. The new trusted wrapper
can acknowledge governance-only findings after a specific owner comment and rerun.
It preserves the raw findings and does not relax frozen-test protection.

This is an independent branch from main after PR #2 (`ab9d4f6`). It does not include
the unmerged matcher implementation in PR #3 or change learner/product behavior.
The authority and adversarial review are in `integrity-approval-review.md`; the
operational protocol is in `../ci.md`. The owner requested preparation of this fix
for another person to review. Final diff acceptance and merge remain with the owner.

## Review order

1. `scripts/integrity-approval.ts`: fingerprint scope, allowed violation codes,
   authenticated owner identity, latest-command selection, and API failure handling.
2. `scripts/run-test-integrity.ts`: owner lookup from the base Git blob, raw checker
   invocation, CLI failure behavior, and separation between findings and decision.
3. `.github/workflows/test-integrity.yml`: base-only execution, read-only token,
   no candidate dependencies, and no automatic approval/status-writing workflow.
4. New approval contract/integration tests; existing tests and the raw checker
   remain byte-for-byte unchanged.
5. Proposed amendments to `AGENTS.md`, `docs/tdd-policy.md`, and the approval and
   installation instructions in `docs/ci.md`.

## Test-first history

| Phase | Commit | Actual evidence |
| --- | --- | --- |
| Review / importable seam | `cf3a15f` | Architecture review, test plan, non-authorizing functions |
| Approval RED | `78334a6` | 20 failed / 36 passed; meaningful missing behavior, no import failure |
| Approval GREEN | `92fd67a` | 56 approval tests passed; 118 total tests passed |
| Runner seam | `1ab7243` | Importable, deliberately failing runner |
| Runner RED | `965b6dd` | 4 failed / 6 passed; missing real-history and CLI behavior |
| Runner GREEN | `5a0c32f` | 66 approval/integration tests and 128 total tests passed |
| REFACTOR | `367e268` | Trusted-owner lookup isolated; all 66 approval/integration tests passed again |

## Validation

| Check | Local result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test:run` | 128 passed, including 66 new approval/integration tests |
| `npm run test:integrity` | 125 contract tests passed (also included in the full suite) |
| `npm run test:e2e` | 14 passed using installed `/usr/bin/chromium` via the existing executable-path option |
| `npm run test:deployment` | 6 passed against local Wrangler; no Cloudflare resources provisioned |
| `npm run build` | Passed, including the build inside deployment verification |
| `git diff --check` | Passed |
| Raw `npm run check:test-integrity` | **Failed as expected**: only protected governance changes; this is not a passing gate |
| Live owner-comment authorization in GitHub | **Unverified until installation** in the trusted base and fresh post-merge verification |
| Mutation testing | Not applicable to this infrastructure-only branch; no domain implementation changes |

The first local browser attempt failed before browser launch because Playwright's
bundled executable was absent. The existing supported system-Chromium option was
then used; all 14 tests actually ran and passed. No test or configuration was changed
to hide that environment failure. No claim is made that the first attempt passed.

## Integrity and limitations

- Existing Tier 1 modifications: **0**. Test deletions: **0**. Test bypasses: **0**.
  Unauthorized expected-output changes: **0**. Tier 2 revisions: **0**.
- The raw checker file is unchanged. Approval cannot clear any non-governance or
  unknown violation, even when mixed with approved governance findings.
- This PR's trusted check still runs the old base-owned code. Its governance failure
  is expected and must not be described as green. The owner must review the exact
  diff/head and use the existing scoped installation exception if branch rules
  require it; the agent neither approves nor merges this PR.
- After installation, the owner posts the exact command printed by the check and
  reruns it. An ordinary review approval is not sufficient and does not auto-rerun.
- Approval is a checked snapshot, not a live subscription. Later revocation/edit/
  deletion requires rerunning and inspecting the timeline before merge.
- The connected coding identity is not proven separate from the owner. A service
  cannot distinguish a human from automation using the same GitHub account. The
  existing requirement for distinct non-admin coding credentials remains essential;
  this PR does not configure accounts, permissions, branch rules, or bypass rights.
- A separate reviewer can review the proposed change, but this protocol does not
  silently grant that reviewer owner-approval authority.

Before treating installation as verified, follow the fresh governance-only and
tamper-PR checks in `docs/ci.md`. Preserve RED/GREEN history with a merge commit.
