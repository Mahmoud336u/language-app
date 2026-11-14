# Owner authorization: M1 session save/resume

Date: 2026-11-14. Owner: @Mahmoud336u.
Approval reference: https://github.com/Mahmoud336u/language-app/pull/11

## Source of authorization

Approval was given in the current Codex conversation, not inferred from CI success,
a PR approval badge, or the agent's technical verdict. The owner first approved the
three architecture questions with four amendments, then accepted the agent's
recommendation to retain the versionchange connection-closure test:

> ok we will go with the recommendations is there anything else we need to discuss

The owner subsequently authorized repository work and requested preflight analysis:

> go on implementing the PR and before that analyze the repo to see is there is anything to do manually first tell me

This record transcribes that authorization; the agent is not approving its own
recommendation or posting an integrity approval on the owner's behalf.

## Approved changes from the original PR #11 proposal

1. IndexedDB completion-based acknowledgment and distinguishable typed failures.
   Backup/export and import/recovery are the very next persistence slice; no
   learner pilot before that slice exists, is reviewed, and passes approved checks.
2. Store snapshot (identity/schema version/creation time/items), ordered attempts,
   and discardedAt only. Derive status, progress, next item, and last activity time.
   Remove revision preconditions and stored updatedAt/status. Exact retries count
   once; current-occurrence checks inside the transaction prevent lost updates.
3. Stale discard is accepted and retains any intervening saved attempts. A completed
   session still cannot be discarded. Incorrect answers advance; unfinished work
   remains resumable indefinitely until explicit discard.
4. Store valid clock values as supplied, including backward movement; attempt
   sequence determines order. No backward clamp or monotonic timestamp requirement.
5. Inactivity causes no automatic stored-state change. Future display-time staleness
   or archival grouping must preserve access and resumption; no archive mechanism
   or threshold is implemented now.
6. Defer blocked-upgrade/migration-transition tests. Retain transaction abort after
   successful put and versionchange connection closure exercised through deletion.
   Unsupported formats are rejected without resetting data; this is not a migration.
7. Run the IndexedDB browser suite on Chromium, Firefox, and WebKit in CI, with
   Chromium as the normal local target. Do not claim this verifies iOS durability.
8. Consolidate the original contract/test plan around these changes before RED.
   See [the amended review](m1-session-persistence-review.md), clauses C-01–C-06 and
   its 18 test groups. Remaining original bounds and matcher contracts are unchanged.

The architecture, D-05 version 2, scoped D-10 version 1, and amended testing scope
are authorized. Source implementation and frozen tests have not been added by this
approval-record PR. Workflow/configuration changes needed for the approved browser
coverage remain subject to protected-change inspection before their merge.

## Boundaries and human actions

- No full learning UI, course publication, scheduler, backup format, import merge
  policy, accounts, external infrastructure, or release authorization is included.
- The PR author/coding identity remains @Mahmoud336u by the owner's earlier choice;
  @Mahmoud44G independently reviews protected changes. The admin-capable coding
  identity remains the previously documented limitation, not a newly imposed block.
- Only @Mahmoud336u may personally post the exact trusted-check integrity command.
  Chat authorization permits recording these decisions but does not synthesize that
  authenticated GitHub comment. @Mahmoud44G's review serves the separate PR gate.
- Preserve commits with merge commits; no force-push, squash, or rebase.
