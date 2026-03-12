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
| The approved architecture package originally recommended `apps/api`, `apps/bot`, `apps/miniapp`, and `apps/worker` before the zero-cost deployment simplification | `PLAN_arch.md`, `DECISIONS.md` |
| Workspace build completes successfully after wiring the combined API plus bot foundation and Prisma baseline | `corepack pnpm build` on 2026-03-11 |
| Workspace typecheck completes successfully for runnable foundation packages and apps | `corepack pnpm typecheck` on 2026-03-11 |
| Combined backend bootstrap starts and exposes `/api/health` plus `/telegram/webhook` | `corepack pnpm --filter @corens/api start` smoke run on 2026-03-11 |

## Open Verification

- [ ] Mini App real Next.js runtime is wired instead of placeholder scripts
- [ ] Telegram auth validation and webhook handling pass integration tests
