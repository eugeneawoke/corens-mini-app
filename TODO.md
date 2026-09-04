# TODO.md

_Keep one active task at a time. Start every task in a fresh session with `MASTER_PROMPT.md`._

## Active Task

- [ ] Implement the approved post-onboarding profile/settings redesign
  - follow `docs/superpowers/plans/2026-09-02-profile-settings-redesign.md`

## Up Next — One Fresh Session Each

1. Phase F / Session 1 — Define the closed-cohort runbook and privacy-safe sampling record.
2. Phase F / Session 2 — Recruit the approved cohort only after the runbook and sampling record are reviewed.

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
| 2026-08-26 | Reframed entry, onboarding, connection, Beacon, and bot copy around a present conversation need and added the approved stable universal starter after mutual contact approval |
| 2026-08-26 | Verified the complete same-match conversation-feedback path and added a privacy-safe read-only pilot export with HMAC-pseudonymous match identifiers |
| 2026-08-26 | Rebuilt onboarding as a button-controlled four-card form with explicit required/optional rules, compact selected-option explanations, one neutral state selector without light/shadow grouping, and full-card fit at 390×844 |
| 2026-09-04 | Added API-enforced profile content moderation, action-first connection ordering, compact accessible consent states, and peer bio on connection detail; completed the aggregate-only read-only production profile scan |
