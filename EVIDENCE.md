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
| The founder reports approximately 20–30 conversations in which people described the Corens idea as valuable or needed; transcripts and interview method have not yet been audited | explicit founder report in the product review session on 2026-08-14 |
| Contact consent records are scoped by `matchSessionId` and `requestedBy`; the runtime uses a deterministic id containing match id, user id, and channel when upserting each decision | local source review of `apps/api/src/modules/consents/runtime.service.ts` and `packages/db/prisma/schema.prisma` on 2026-08-14 |
| Mutual contact approval exposes a Telegram deep link for that match, while the actual private Telegram conversation is outside the Corens runtime | local source review of `apps/api/src/modules/consents/runtime.service.ts` and `apps/miniapp/src/components/telegram-link-button.tsx` on 2026-08-14 |
| The current Telegram handoff button does not persist a click event, and the current schema has no conversation-outcome feedback model | local source review of `apps/miniapp/src/components/telegram-link-button.tsx`, `packages/db/prisma/schema.prisma`, and `docs/analytics/event-schema.md` on 2026-08-14 |
| Conversation feedback now has shared categorical types, same-match pair-status derivation, one persisted record per participant and match session, opaque callback tokens, and config-backed prompt timing before runtime wiring | focused Vitest tests (12/12), Prisma validation, workspace test (41/41), typecheck, and build on 2026-08-21 |
| Same-match mutual contact approval now idempotently creates the participant feedback pair; the authenticated no-body contact-open route records only the first match handoff open, advances both pending prompt due times without delaying earlier ones, and the Mini App opens Telegram without waiting for tracking | focused Vitest tests (13/13), workspace test (48/48), typecheck, build, source/diff review, and deep-link payload search on 2026-08-21 |
| At the Session 3 verification point, the Telegram bot feedback runtime provided the approved outcome-prompt sender, accepted only compact allowlisted callbacks containing an opaque feedback token, verified the Telegram actor against the participant record, followed the value/obstacle branch through next intent, rejected stale or duplicate writes, and ended with the approved thank-you without free text; due-record selection and delivery were still separate | focused Vitest tests (10/10), workspace test (58/58), typecheck, build, source/diff review, and callback payload privacy search on 2026-08-24 |
| The existing in-process maintenance sweep now uses a guarded config-backed 15-minute delivery lease: fresh claims suppress concurrent sends, abandoned claims are recovered, `promptedAt` is written only after Telegram accepts the send, known failures release the lease, attempts stop at three, and every retry reuses the same opaque callback token; the accepted trade-off is a rare duplicate after an ambiguous crash instead of silent prompt loss | focused Vitest tests (24/24), workspace test (64/64), Prisma validation, typecheck, build, source/diff review, and GitNexus change detection on 2026-08-24 |
| The production Railway database has the conversation-feedback base migration and prompt-lease migration applied and tracked; the `ConversationFeedback` table, `promptClaimedAt` column, and lease lookup index are present | transactional `railway connect Postgres -e production` migration run followed by catalog and migration-journal queries on 2026-08-24 |

## Open Verification

- [ ] Deterministic matching, consent, deletion, and moderation transitions are race-safe
- [ ] Full automated test pyramid (including Playwright e2e) runs with deterministic seeds and passes
- [ ] Existing interview notes establish whether the problem was raised unprompted and whether any of the 20–30 people completed the current product flow
- [ ] A closed cohort produces match-scoped contact-open, conversation-outcome, value, and repeat-intent evidence
