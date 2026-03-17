# TODO.md

_Keep one active task at a time._

## Active Task

- [ ] Phase D - Full Automated Test Pyramid
  - extend Vitest coverage beyond auth/config into matching, consent, deletion, and moderation transitions
  - add Playwright e2e coverage for auth bootstrap, onboarding, `/connection`, consent, Beacon, and delete flows
  - add deterministic test seeding for one-user, two-user, moderated, and deleted states
  - keep `pnpm test` meaningful while separating browser e2e setup from unit/contract/integration runs

## Backlog

- Phase C - Deterministic Matching & Consent Hardening: broaden pair-safety, retention cleanup semantics, and moderation/deletion coverage
- Phase E - Release Readiness & Documentation: release checklist, documentation refresh, no-demo verification

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
