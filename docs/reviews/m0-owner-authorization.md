# M0 owner authorization

Date: 2026-11-12. Source: the repository owner's current Codex conversation.

After reviewing `m0-architecture-review.md`, the owner instructed:

> apply all the recommendations in the M0 stage

The owner then resolved the repository identity:

> Use language-app; name the application Unpause Languages

This explicitly authorizes the proposed M0 implementation, G-01–G-06 governance amendments, protected foundation configuration, neutral component harness, and the M0 Tier 1 plan. The owner's latest instruction authorizes applying those amendments despite the earlier request to leave them unapplied during planning. This is an engineering approval, not approval of product decisions.

Approved test-plan names: allows_new_unchanged_contract; rejects_main_contract_tampering; rejects_branch_contract_tampering; rejects_restore_and_merge_evasion; rejects_missing_history; rejects_skip_focus_and_discovery_bypass; requires_approved_tier2_decision; rejects_forged_approval_and_checker_changes; never_executes_pr_payload. Parameterized cases make each failure mechanism explicit. No automatic exception fixture is needed: the checker deliberately has no bypass mechanism; the owner controls exceptions outside the check.

D-01–D-11 remain PROPOSED. No matcher, sessions, persistence, scheduling, lessons, full homepage, AI, accounts, provisioning, or deployment is authorized. The architecture verdict remains SIMPLIFY FIRST. The first PR must be merged by the owner and followed by verification of trusted enforcement. Repository settings and credential identity are owner-controlled; an agent-authored record is not proof those settings exist.
