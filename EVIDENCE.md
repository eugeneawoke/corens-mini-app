# EVIDENCE.md

_Store verified facts only, each with a source._

## Verified Inputs

| Fact | Source |
|---|---|
| The approved MVP uses a modular backend for Telegram Bot plus Mini App | `PLAN_arch.md` |
| Matching is automatic; Beacon is the only manual matching-related mode | `PLAN_arch.md` |
| Contact reveal and photo reveal are separate mutual consent flows | `PLAN_arch.md` |
| Contact handoff reveals only a Telegram deep link after mutual contact consent | `PLAN_arch.md` |
| Matching, Beacon, reveal, and retention rules must be config-backed | `PLAN_arch.md` |
| Cleanup plan phases (A–E) define runtime sanitation, auth/session bootstrap, deterministic matching, tests, and release-ready documentation as the next set of deliverables | `/Users/eugene.gusakov/Downloads/фаза_финал.md` |
| Auth bootstrap/session guard, no `/home`, and zero-demo fallbacks are explicit requirements for Phase A runtime sanitation | `/Users/eugene.gusakov/Downloads/фаза_финал.md` |
| Release readiness hinges on unit/contract/integration/e2e suites plus runtime documentation refresh per the cleanup plan | `/Users/eugene.gusakov/Downloads/фаза_финал.md` |
| Runtime demo fallbacks were removed from the Mini App data path and `/api/home/summary` was retired in favor of the `/connection` surface | local source review on 2026-03-17 |
| Telegram Mini App init-data validation, backend session bootstrap/revoke, and per-route auth guards are implemented in the combined `apps/api` runtime | local source review on 2026-03-17 |
| Workspace `pnpm test` passes meaningful Vitest unit, contract, and integration suites | `corepack pnpm test` on 2026-03-17 |
| Workspace `pnpm typecheck` passes after the auth/session cleanup | `corepack pnpm typecheck` on 2026-03-17 |
| Workspace `pnpm build` passes after the auth/session cleanup | `corepack pnpm build` on 2026-03-17 |

## Open Verification

- [ ] Deterministic matching, consent, deletion, and moderation transitions are race-safe
- [ ] Full automated test pyramid (including Playwright e2e) runs with deterministic seeds and passes
