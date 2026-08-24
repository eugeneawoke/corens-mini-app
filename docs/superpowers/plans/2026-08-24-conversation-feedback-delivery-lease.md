# Conversation Feedback Delivery Lease Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover conversation-feedback delivery after an abandoned database claim without adding a worker or allowing unbounded retries.

**Architecture:** Store claim time separately from confirmed delivery time. The existing maintenance sweep reclaims leases at the config-backed cutoff and finalizes successful Telegram delivery with a guarded update.

**Tech Stack:** TypeScript, NestJS, Prisma, PostgreSQL, grammY, Vitest.

**Spec:** `docs/plans/2026-08-24-conversation-feedback-delivery-lease-design.md`

## Global Constraints

- Keep delayed work inside the combined `apps/api` in-process maintenance runtime.
- Reuse the existing opaque callback token and bot outcome-prompt handler.
- Keep retries and lease duration in `config/conversation-feedback/rules.v1.yaml`.
- Never log Telegram identifiers, callback tokens, deep links, or private message content.
- Do not commit unless the user explicitly requests it.

---

### Task 1: Recoverable Prompt Delivery Lease

**Files:**
- Modify: `config/conversation-feedback/rules.v1.yaml`
- Modify: `packages/config/src/schemas.ts`
- Modify: `apps/api/src/policy-config.service.ts`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `migrations/2026-08-24-conversation-feedback-prompt-lease.sql`
- Modify: `apps/api/src/modules/conversation-feedback/service.ts`
- Modify: `apps/api/src/maintenance/maintenance.service.ts`
- Modify: `tests/contract/conversation-feedback-config.test.ts`
- Modify: `tests/integration/conversation-feedback-maintenance.test.ts`

**Interfaces:**
- Consume `delivery.claimLeaseMinutes: number` from `ConversationFeedbackRulesConfig`.
- Persist `ConversationFeedback.promptClaimedAt: Date | null`.
- Produce guarded `claimPromptDelivery`, `markPromptDelivered`, and `releasePromptDelivery` state transitions.

- [x] **Step 1: Write failing policy and maintenance tests**

Add the literal policy expectation `claimLeaseMinutes: 15`. Seed one claim exactly 15 minutes old and one newer than 15 minutes; assert only the expired lease is delivered. During the fake Telegram send, assert the record has `promptClaimedAt` set and `promptedAt` still null; after success assert the reverse.

- [x] **Step 2: Run tests to verify expected failure**

Run:

```bash
corepack pnpm exec vitest run tests/contract/conversation-feedback-config.test.ts tests/integration/conversation-feedback-maintenance.test.ts
```

Expected: the policy shape lacks `claimLeaseMinutes`, and fresh/stale claims are not distinguished.

- [x] **Step 3: Add policy, schema, and migration**

Add:

```yaml
delivery:
  reminder_enabled: false
  max_prompt_attempts: 3
  claim_lease_minutes: 15
```

Add `claimLeaseMinutes: number` to the config interface/loader and `promptClaimedAt DateTime?` to the Prisma model. Add an idempotent SQL migration using `ADD COLUMN IF NOT EXISTS` and an index supporting pending delivery lookup.

- [x] **Step 4: Implement guarded lease transitions**

`findDuePrompts(now)` includes records whose claim is null or at/before `now - claimLeaseMinutes`. `claimPromptDelivery` writes only `promptClaimedAt` plus an attempt increment. `markPromptDelivered` matches the acquired claim, clears it, and sets `promptedAt`. `releasePromptDelivery` matches the acquired claim and clears it without changing `promptedAt`.

- [x] **Step 5: Finalize only after Telegram success**

In `MaintenanceService.runSweep`, call `markPromptDelivered` only after `sendOutcomeQuestion` resolves. Preserve per-record failure isolation and release a known failed claim for a later sweep.

- [x] **Step 6: Verify the complete change**

Run:

```bash
corepack pnpm exec vitest run tests/contract/conversation-feedback-config.test.ts tests/integration/conversation-feedback-maintenance.test.ts
corepack pnpm test
corepack pnpm --filter @corens/db exec prisma validate
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

Then run GitNexus change detection and inspect every changed file. Do not commit.
