# Owner-approved mechanical test correction: PR #13

Date: 2026-11-14. Affected file: `tests/contracts/session-state.test.ts`.
Original RED: `144c975`. Correction: `cc973a5`.

## Request and approval

The agent committed six TypeScript non-null assertions before lint caught them.
This was an agent sequencing mistake, not a defect in the approved product behavior.
The frozen file could not be fixed through production code. Keeping it unchanged
would leave the required ESLint check failing; relaxing lint or hiding the file would
weaken a quality gate and was not proposed.

The exact diff was presented before editing: introduce a `requiredItem` helper
that throws if the selected fixture item is absent, then replace only six `!`
accesses with calls to that helper. Tests for snapshot detachment, duplicate IDs,
prompt validation/bounds, and matcher feedback retain all original expectations.
No test, assertion, expected result, or fixture was deleted or changed.

The owner explicitly replied in the current conversation:

> Approve the exact mechanical correction; discuss the merge route

The correction is a separate commit. The original RED and subsequent history are
preserved. All 65 domain/state validation tests, typecheck, and lint passed after
the approved correction. No force-push or rewrite was performed.

## Enforcement limitation — unresolved

The raw checker correctly reports `FROZEN_CHANGE` for this commit. The trusted
wrapper accepts only governance findings, so an `/integrity-approve` comment cannot
waive this frozen-file finding, even with explicit owner approval in chat.

Owner approval of the exact edit is not authorization for the agent to alter branch
rules, bypass checks, change the checker, or merge. No such action was performed.
The merge route remains a separate owner decision after the concrete implementation
and normal quality evidence are ready. Do not label trusted integrity as passing.

Potential routes must preserve the audit trail and receive explicit review: an
owner-controlled narrowly scoped administrative merge exception, if permitted by
repository governance, or a separately reviewed governance amendment implementing
an exact, authenticated frozen-test exception. Neither route is preapproved here.

## Recommended route for discussion, not implementation approval

Prefer a separate governance-only PR based on main that defines a narrowly scoped
exception for this exact authorized correction. It must land before PR #13 can use
it. The existing raw checker must keep reporting the finding; only trusted-base
approval handling may recognize the separately reviewed exception. The proposal
must bind the repository, PR #13, path, correction commit, old/new blob IDs, and
complete current base/head/findings fingerprint to authenticated owner approval.

Exact correction identity:

- Commit: `cc973a5e446e08e2c72a0944f270c24bd8b3773f`.
- Path: `tests/contracts/session-state.test.ts`.
- Before blob: `6ef64c1f535b0360cf6edb5a6fcd621c245f3f7c`.
- After blob: `cbc38e844126fc816515478e079b2e94f861bd83`.
- [Reviewable diff](https://github.com/Mahmoud336u/language-app/commit/cc973a5e446e08e2c72a0944f270c24bd8b3773f).

Other frozen changes, deletions, skips, malformed/stale approvals, and unavailable
history must still fail closed. The exception must not make PR-local declarations
trusted, execute PR code in the privileged workflow, or erase original findings.
New tests must prove the exact exception and rejection of altered identities or
additional unauthorized changes. Existing frozen integrity tests remain untouched.

The separate PR requires its own governance review, test plan, owner authorization,
RED/GREEN evidence, ordinary quality checks, and independent review. Its governance
changes can use the already installed governance-only acknowledgment process;
it must not approve itself using candidate code. After merge, preserve PR #13's
history with a normal merge from main and trigger a fresh trusted workflow event.
Rerunning an old workflow does not install new trusted code.

This costs a small additional enforcement change, but preserves required checks
and the original RED history. A manual administrative exception is less code but
is not authorized here and would need a separately documented owner decision.
