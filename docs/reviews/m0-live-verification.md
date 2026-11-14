# M0 live verification

Updated: 2026-11-14.
Repository: `Mahmoud336u/language-app`.
Closure PR: [#8](https://github.com/Mahmoud336u/language-app/pull/8).

**Status: partial evidence verified; history-drill output and final closure
review remain pending.**

## Summary

- [x] Harmless PR: observed quality and trusted integrity checks pass.
- [x] Missing eligible reviewer approval blocks merging.
- [x] Trusted integrity-log artifact is available.
- [x] Frozen-test tampering is rejected.
- [x] Tamper PR is closed without merging.
- [ ] Feature-branch history rewrite rejection output is recorded.
- [ ] Feature-branch deletion rejection output is recorded.
- [ ] Updated account-role and completion documentation is reviewed.
- [ ] Final closure revision passes all required checks.
- [ ] Closure PR is approved and merged.
- [ ] Resulting main quality run passes.

## 1. Harmless PR and review requirement

PR:
https://github.com/Mahmoud336u/language-app/pull/8

Initial harmless head:
`0c92c3358d640c817fd7e9df112da370786aeb80`.

Quality:
https://github.com/Mahmoud336u/language-app/actions/runs/43526905228

Trusted integrity:
https://github.com/Mahmoud336u/language-app/actions/runs/43526905957

Observed result: both workflows passed. GitHub reported PR #8 as merge-blocked
while an eligible approving review was absent.

The active main ruleset requires an approving review, CODEOWNER review, and
approval after the most recent reviewable push.

A later documentation revision,
`e148e9cf38ae192b1e1881bc9f2794f541ecc34d`, also passed:

- Quality: https://github.com/Mahmoud336u/language-app/actions/runs/43533345073
- Trusted integrity: https://github.com/Mahmoud336u/language-app/actions/runs/43533341541

These results apply only to the listed revisions. Final documentation changes
must pass their own checks.

## 2. Trusted-log visibility

Run:
https://github.com/Mahmoud336u/language-app/actions/runs/43526905957

Artifact: `test-integrity-log`.

GitHub's artifact API confirmed that the artifact was created and was not expired
when inspected. Retention is 14 days.

The workflow also writes the complete output to the job summary. Retain relevant
output or screenshots before artifact expiry if longer-term evidence is needed.

## 3. Frozen-file rejection

Probe PR:
https://github.com/Mahmoud336u/language-app/pull/9

Owner authorization:
https://github.com/Mahmoud336u/language-app/pull/9#issuecomment-6867790390

Probe head:
`8b87c2146f2d49583231a2313fe887dea0f5e3bd`.

Changed file: `tests/contracts/integrity.test.ts`.

The probe inserted this comment beneath the environment directive:

```typescript
// M0 enforcement probe: intentional frozen-file edit; never merge.
```

No assertions or expected values changed.

Trusted run:
https://github.com/Mahmoud336u/language-app/actions/runs/43529660335

Observed findings:

```text
code: FROZEN_CHANGE
path: tests/contracts/integrity.test.ts
message: Frozen content changed after its first commit; restoration does not erase history.
decision.status: blocked
exit code: 1
```

The ordinary quality workflow passed:

https://github.com/Mahmoud336u/language-app/actions/runs/43529663979

This demonstrates that the trusted gate can reject a frozen-file edit even when
ordinary application checks pass.

PR #9 is closed without merging. Its red integrity result is the expected
negative-test outcome.

## 4. Feature-history rewrite rejection

Target branch: `m0/verify-history-20261114`.

Scoped owner authorization:
https://github.com/Mahmoud336u/language-app/pull/9#issuecomment-6867875251

Saved feature-history settings were verified:

- Active ruleset `27225932`.
- All branches included except `refs/heads/main`.
- Non-fast-forward updates blocked.
- Deletion blocked.
- No bypass actors.

**Live drill status: pending terminal evidence.**

The prior checklist marked this complete, but terminal output has not yet been
included in this record. Do not infer successful enforcement from the checkbox.

If the drill was already performed, record its actual result below. Otherwise,
perform the authorized disposable-branch drill.

Record:

- Observation date:
- Authenticated account:
- Branch head before the attempt:
- Proposed backward target SHA:
- Exact command:
- Actual terminal output:
- GitHub rejection reason:
- Result: PASSED / FAILED / UNVERIFIED

Expected result: GitHub rejects a backward update because of the repository's
non-fast-forward protection.

Authentication, network, or stale-lease errors do not establish this result.

## 5. Feature-branch deletion rejection

Target branch: `m0/verify-history-20261114`.

**Live drill status: pending terminal evidence.**

Record:

- Observation date:
- Authenticated account:
- Branch SHA before the attempt:
- Exact command:
- Actual terminal output:
- GitHub rejection reason:
- Result: PASSED / FAILED / UNVERIFIED

Expected result: GitHub rejects deletion because of the repository's deletion
protection.

If deletion succeeds, record FAILED and investigate the ruleset. Do not mark the
check passed merely because the branch no longer exists.

## 6. Account arrangement and limitations

Owner-selected roles:

- @Mahmoud336u codes, pushes branches, opens normal PRs, and personally provides
  governance-integrity acknowledgments.
- @Mahmoud44G reviews normal PRs and approves or rejects them.
- Merge occurs only after the required checks and eligible review are satisfied.

The owner retained an admin-capable coding account as an explicit exception to
the earlier non-admin recommendation. This remains a security limitation.

CODEOWNERS does not delegate the integrity command or product-decision authority.
Agents must never post owner acknowledgment commands on the owner's behalf.

Separate accounts do not prove review by a different human.

## 7. Final closure

Complete after all final documentation changes are committed:

- Final PR #8 head SHA:
- Final quality run URL and result:
- Final trusted integrity run URL and result:
- @Mahmoud44G approval URL and reviewed commit:
- Merge commit SHA:
- Resulting main quality run URL and result:
- Remaining limitations:
- M0 status: PENDING / COMPLETE

Only mark M0 COMPLETE after the history-drill evidence is recorded, the final
documents are reviewed and merged, and the resulting main quality run passes.
