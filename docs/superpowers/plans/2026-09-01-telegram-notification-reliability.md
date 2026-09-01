# Telegram Notification Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver new-match, consent-request, and connection-ending notifications independently of Mini App opening and delete only the notification the user actually opens.

**Architecture:** Keep the combined API/bot runtime and in-process scheduler. Add an opaque per-message acknowledgement id to Mini App URLs, actor-bind deletion, make consent/expiry delivery transition-idempotent, and avoid a new worker or general outbox.

**Tech Stack:** TypeScript, NestJS, Next.js 15, grammY, Prisma, Vitest, Playwright, Railway.

**Spec:** `docs/plans/2026-09-01-telegram-notification-reliability-design.md`

## Global Constraints

- Preserve separate contact/photo consent and match scoping.
- Preserve the zero-cost combined `apps/api` runtime.
- Do not expose Telegram identifiers, usernames, deep links, or message content in analytics.
- Do not notify a target that a report was filed.
- Do not mutate Railway or deploy without explicit release authorization.

---

### Task 1: Address one Telegram notification

**Files:**
- Create: `tests/unit/bot-notification-cleanup.test.ts`
- Modify: `tests/unit/matching-notification.test.ts`
- Modify: `apps/api/src/telegram/bot-notification.service.ts`
- Modify: `apps/api/src/auth.controller.ts`
- Modify: `apps/api/src/profile.controller.ts`
- Modify: `apps/api/src/request-validation.ts`
- Modify: `apps/miniapp/src/app/actions.ts`
- Modify: `apps/miniapp/src/components/notification-cleanup.tsx`
- Modify: `apps/miniapp/src/app/connection/page.tsx`
- Modify: `apps/miniapp/src/app/connection/[id]/page.tsx`

**Produces:** `cleanupNotification(telegramUserId, notificationId)` and notification URLs carrying `notificationId`.

- [x] Write tests for an opaque URL id, actor-bound single-message deletion, no auth blanket cleanup, and no client cleanup without an id.
- [x] Run focused tests and observe failures caused by current blanket cleanup/missing token.
- [x] Implement the minimal addressed send and cleanup flow.
- [x] Run focused tests until green.

### Task 2: Make consent requests transition-idempotent

**Files:**
- Modify: `tests/unit/consents.runtime.test.ts`
- Modify: `apps/api/src/modules/consents/runtime.service.ts`

- [x] Add failing contact and photo tests that repeat the same approval and expect one peer notification.
- [x] Read the existing participant/channel decision before upsert and notify only on transition into `approved`.
- [x] Run consent and conversation-feedback regression tests.

### Task 3: Notify both participants once on expiry

**Files:**
- Create: `tests/unit/matching-expiry-notification.test.ts`
- Modify: `apps/api/src/modules/matching/runtime.service.ts`

- [x] Add a failing concurrent-expiry test expecting one closure notification per participant.
- [x] Guard the active-to-expired database transition and notify only after the successful transition.
- [x] Run matching, maintenance, and feedback regression tests.

### Task 4: Verify release readiness

**Files:**
- Modify: `.env.example`
- Modify: `EVIDENCE.md`
- Modify: `/Users/eugene.gusakov/.corens-mini-app/memory/project-state.md`

- [x] Document `ENABLE_MAINTENANCE_SCHEDULER=true` as required for the release environment.
- [x] Run `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build`, and the focused Playwright scenario.
- [x] Run privacy/notification source searches and GitNexus `detect_changes` for this worktree.
- [x] Record only verified facts; do not claim production behavior before an authorized release.
