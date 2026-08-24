# TODO.md

_Keep one active task at a time. Start every task in a fresh session with `MASTER_PROMPT.md`._

## Active Task

- [ ] Phase E / Session 5 — Conversation-focused product copy and opening-message suggestion
  - rewrite intro, onboarding, connection, Beacon, and notification copy around a needed conversation
  - add the approved universal opening-message suggestion after mutual contact approval
  - preserve state, intent, Trust Keys, Beacon, consent, and the Telegram handoff
  - add focused copy, deterministic-selection, and mobile UI coverage

## Up Next — One Fresh Session Each

1. Phase E / Session 6 — Add end-to-end validation, pilot export, privacy audit, and release evidence.

## Backlog

- Phase C — Broaden pair-safety, retention cleanup semantics, and moderation/deletion coverage.
- Phase D — Complete Playwright coverage for auth bootstrap, onboarding, `/connection`, consent, Beacon, delete, and conversation feedback.
- Phase F — Prepare and run the coordinated closed cohort.
- Remove the temporary dev reset button from `Профиль -> Дополнительно` before live launch.
- Consider small-group conversations only after the person-to-person validation cycle.

## Current Constraints

- Preserve the existing user-owned `.claude/settings.local.json` change and exclude it from unrelated session commits.
- Run GitNexus impact analysis before editing every symbol and `gitnexus_detect_changes()` before committing.
- Do not read or store private Telegram conversation content.
- Do not count contact open or one-sided feedback as a mutually confirmed conversation.

## Done

| Date | Item |
|---|---|
| 2026-03-11 | Approved architecture package and starter scaffold plan prepared |
| 2026-03-11 | Runnable zero-cost foundation added for combined API plus bot, Prisma, and workspace build/typecheck |
| 2026-03-16 | Removed demo-backed startup connection and added first real onboarding gate |
| 2026-03-16 | Made connection the primary screen and turned profile controls into real write paths |
| 2026-03-16 | Added persistence-backed matching runtime and Beacon fallback on config-backed rules |
| 2026-03-16 | Added persistence-backed separate consent flows with Telegram deep-link handoff |
| 2026-03-17 | Removed runtime demo fallbacks and retired the `/api/home/summary` surface |
| 2026-03-17 | Added Telegram init-data validation, backend session bootstrap/revoke, and guarded Mini App API routes |
| 2026-03-17 | Added Vitest-backed unit, contract, and integration suites so `pnpm test` runs meaningful checks |
| 2026-08-14 | Fixed the conversation-validation contract, evidence ladder, feedback sequence, session master prompt, and re-baselined implementation plan |
| 2026-08-21 | Added and verified the conversation-feedback domain, policy, persistence model, migration, service, and pair-status rules before runtime wiring |
| 2026-08-21 | Wired same-match mutual contact approval to feedback creation and added first contact-handoff tracking without submitting or storing the Telegram link |
| 2026-08-24 | Added and verified the three-question Telegram bot feedback sequence with opaque callbacks, actor binding, branch validation, idempotent writes, and final thank-you |
| 2026-08-24 | Added and verified due feedback prompt delivery through the in-process maintenance sweep with recoverable guarded leases, bounded retry, and expiry |
