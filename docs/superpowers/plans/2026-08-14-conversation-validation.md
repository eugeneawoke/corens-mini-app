# Conversation Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing bot + Mini App flow from mutual contact reveal to privacy-preserving measurement of mutually confirmed, useful conversations.

**Architecture:** Keep `apps/api` as the combined API, Telegram webhook, and in-process maintenance runtime. Store one feedback record per participant and match session, record the Telegram handoff click as a proxy, send a three-question grammY callback sequence, and derive pair confirmation without reading private messages.

**Tech Stack:** TypeScript 5.9, NestJS, grammY, Next.js 15, PostgreSQL, Prisma 6, Vitest, Playwright.

**Spec:** `docs/product/conversation-validation-contract.md`, with the opening-message slice specified in `docs/plans/2026-08-21-universal-conversation-starters-design.md`.

## Global Constraints

- Execute each numbered task in a fresh session using `MASTER_PROMPT.md`.
- Run upstream GitNexus impact before editing every function, class, or method.
- Preserve the pre-existing uncommitted matching and bot-notification changes.
- Keep intent, state, Trust Keys, Beacon, separate consent, safety, privacy, and deletion.
- Never store private Telegram message content or Telegram deep links in analytics.
- Count mutual approval and mutual conversation confirmation only inside one `matchSessionId`.
- Use TDD and run `gitnexus_detect_changes()` before any commit.

---

### Task 1: Conversation Feedback Domain And Persistence

**Session goal:** Create and test the data model and pure pair-status rules without sending prompts or changing UI.

**Files:**
- Create: `packages/domain/src/lib/conversation-feedback.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `migrations/2026-08-14-conversation-feedback.sql`
- Create: `config/conversation-feedback/rules.v1.yaml`
- Modify: `apps/api/src/policy-config.service.ts`
- Create: `apps/api/src/modules/conversation-feedback/service.ts`
- Create: `tests/contract/conversation-feedback-config.test.ts`
- Create: `tests/unit/conversation-feedback.test.ts`
- Create: `tests/integration/conversation-feedback.service.test.ts`

**Interfaces:**
- Produce `ConversationOutcome`, `ConversationValue`, `ConversationObstacle`, `NextConversationIntent`, and `ConversationPairStatus`.
- Produce `ensureForMutualApproval`, `recordOutcome`, `recordValue`, `recordObstacle`, `recordNextIntent`, and `getPairStatus`.
- Key records by `(matchSessionId, participantUserId)`.

- [ ] **Step 1: Write failing pair-status tests**

```ts
expect(deriveConversationPairStatus("match-1", [
  { matchSessionId: "match-1", participantUserId: "a", outcome: "talked" },
  { matchSessionId: "match-1", participantUserId: "b", outcome: "talked" }
])).toBe("mutually_confirmed");

expect(deriveConversationPairStatus("match-1", [
  { matchSessionId: "match-1", participantUserId: "a", outcome: "talked" },
  { matchSessionId: "match-2", participantUserId: "b", outcome: "talked" }
])).toBe("one_sided_report");
```

- [ ] **Step 2: Run the focused test and confirm the module is missing**

Run: `corepack pnpm exec vitest run tests/unit/conversation-feedback.test.ts`
Expected: FAIL because the domain module does not exist.

- [ ] **Step 3: Add the exact domain types**

```ts
export type ConversationOutcome =
  | "talked"
  | "wrote_no_reply"
  | "did_not_write"
  | "declined_after_match"
  | "technical_issue";
export type ConversationValue = "yes" | "partly" | "no";
export type ConversationObstacle =
  | "bad_timing"
  | "poor_fit"
  | "did_not_know_how_to_start"
  | "insufficient_safety"
  | "technical_issue";
export type NextConversationIntent = "now" | "later" | "not_now";
export type ConversationPairStatus =
  | "awaiting_reports"
  | "one_sided_report"
  | "conflicting_reports"
  | "mutually_confirmed";
```

- [ ] **Step 4: Add the Prisma model and equivalent SQL migration**

```prisma
model ConversationFeedback {
  id                String   @id
  matchSessionId    String
  participantUserId String
  callbackToken     String   @unique
  contactOpenedAt   DateTime?
  promptDueAt       DateTime
  promptedAt        DateTime?
  promptAttempts    Int      @default(0)
  outcome           String?
  value             String?
  obstacle          String?
  nextIntent        String?
  completedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([matchSessionId, participantUserId])
  @@index([promptDueAt, promptedAt])
  @@index([matchSessionId])
}
```

Use deterministic id `${matchSessionId}:${participantUserId}` and a random opaque `callbackToken`. Load the 24/48-hour due rules from `config/conversation-feedback/rules.v1.yaml`; do not hardcode them in the runtime service.

- [ ] **Step 5: Test idempotent pair creation and participant authorization**

`ensureForMutualApproval` must create exactly two records, remain idempotent, and reject writes by a user outside the match.

- [ ] **Step 6: Implement the minimal service and verify**

Run:

```bash
corepack pnpm exec vitest run tests/unit/conversation-feedback.test.ts
corepack pnpm exec vitest run tests/contract/conversation-feedback-config.test.ts
corepack pnpm exec vitest run tests/integration/conversation-feedback.service.test.ts
corepack pnpm typecheck
```

---

### Task 2: Mutual Approval And Contact Handoff Tracking

**Session goal:** Create feedback records on same-match mutual approval and record the first handoff click without storing the deep link.

**Files:**
- Modify: `apps/api/src/modules/consents/runtime.service.ts`
- Create: `apps/api/src/conversation-feedback.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/miniapp/src/components/telegram-link-button.tsx`
- Create: `apps/miniapp/src/components/contact-handoff-button.tsx`
- Modify: `apps/miniapp/src/app/connection/[id]/page.tsx`
- Add focused tests under `tests/`

**Interfaces:**
- Produce authenticated `POST /api/conversation-feedback/:connectionId/contact-opened`.
- `recordContactOpened` stores only match, participant, and timestamp.

- [ ] **Step 1: Impact-analyse every existing symbol before editing**

At minimum inspect `ConsentRuntimeService.updateStatus`, `ConsentRuntimeService.resolveStatus`, `TelegramLinkButton`, `ConnectionDetailPage`, and `AppModule`.

- [ ] **Step 2: Write failing consent-scope tests**

```text
match-1 / user-a approved + match-1 / user-b approved => mutual
match-1 / user-a approved + match-2 / user-b approved => not mutual
match-1 / user-a approved twice => not mutual
```

- [ ] **Step 3: Wire feedback creation only after same-match resolution becomes approved**

Pass the current match id and its two distinct participant ids. Repeated reads and decisions must be safe.

- [ ] **Step 4: Implement idempotent contact-open recording**

Move both participants' pending `promptDueAt` to no later than first open plus 24 hours. Tracking failure must never prevent Telegram from opening.

- [ ] **Step 5: Verify Task 2**

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

Confirm no log, request body, or event contains `artifactValue` or a Telegram link.

---

### Task 3: Three-Question Telegram Bot Feedback

**Session goal:** Complete the branching bot sequence for one participant and match.

**Files:**
- Create: `apps/api/src/modules/conversation-feedback/bot-handler.service.ts`
- Modify: `apps/api/src/telegram/bot-notification.service.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `tests/unit/conversation-feedback-bot.test.ts`
- Extend: `tests/unit/telegram-webhook.test.ts`

**Interfaces:**
- Register grammY callbacks under `cf:<step>:<opaqueFeedbackToken>:<answer>`.
- Keep callback data under Telegram limits and validate every answer from an allowlist.

- [ ] **Step 1: Write failing tests for both branches**

```text
talked → value → next intent → thank-you
wrote_no_reply → obstacle → next intent → thank-you
duplicate callback → idempotent write
non-participant callback → no write
```

- [ ] **Step 2: Implement the exact three-question copy**

Question 1: `Что произошло после того, как вы оба согласились открыть контакт?`
Question 2A: `Насколько это был тот разговор, которого тебе не хватало?`
Question 2B: `Что больше всего помешало начать разговор?`
Question 3: `Хотел(а) бы ты, чтобы Corens подобрал следующий разговор?`

Completion:

```text
Спасибо за обратную связь. Она помогает Corens находить не просто совпадения, а разговоры, которые действительно нужны.
```

- [ ] **Step 3: Validate actor, match, current branch, and answer before every write**

Malformed or stale callbacks receive a generic unavailable response without leaking match data.

- [ ] **Step 4: Register the handler before webhook mount and verify**

```bash
corepack pnpm exec vitest run tests/unit/conversation-feedback-bot.test.ts tests/unit/telegram-webhook.test.ts
corepack pnpm test
corepack pnpm typecheck
```

---

### Task 4: Due Prompt Scheduling, Retry, And Expiry

**Session goal:** Deliver due prompts through the existing in-process maintenance runtime.

**Files:**
- Modify: `apps/api/src/modules/conversation-feedback/service.ts`
- Modify: `apps/api/src/maintenance/maintenance.service.ts`
- Create: `tests/integration/conversation-feedback-maintenance.test.ts`

- [ ] **Step 1: Confirm the Task 1 policy contract is loaded**

```yaml
version: v1
timing:
  after_contact_open_hours: 24
  without_contact_open_hours: 48
  expires_after_days: 7
delivery:
  reminder_enabled: false
  max_prompt_attempts: 3
```

- [ ] **Step 2: Test due selection, successful marking, retry, duplicate suppression, and expiry**

Use fake clocks; never use real sleeps.

- [ ] **Step 3: Add `sendDuePrompts(now)` to the existing maintenance sweep**

Use guarded updates so overlapping sweeps do not double-send. One Telegram failure must not stop other records.

- [ ] **Step 4: Run contract, integration, full tests, typecheck, and build**

---

### Task 5: Conversation-Focused Entry And Process Copy

**Session goal:** Make the current promise understandable and reduce first-message friction without removing existing signals or modes.

**Files:**
- Modify: `apps/api/src/telegram/bot-webhook.service.ts`
- Modify: `apps/api/src/telegram/bot-notification.service.ts`
- Modify: `apps/miniapp/src/app/onboarding/intro/intro-slides.tsx`
- Modify: `apps/miniapp/src/app/onboarding/page.tsx`
- Modify: `apps/miniapp/src/app/connection/page.tsx`
- Modify: `apps/miniapp/src/app/connection/[id]/page.tsx`
- Modify: `apps/miniapp/src/app/beacon/page.tsx`
- Create: `apps/miniapp/src/lib/conversation-starters.ts`
- Create: `apps/miniapp/src/components/conversation-starter-card.tsx`
- Create: `tests/unit/conversation-starters.test.ts`
- Add focused copy and mobile UI assertions under the existing test structure

**Interfaces:**
- Produce `UNIVERSAL_CONVERSATION_STARTERS` as the single four-item approved copy pool.
- Produce `selectConversationStarter(connectionId: string): string` as a deterministic selector that uses only the connection id.
- Produce `ConversationStarterCard({ text }: { text: string })` as an optional copyable suggestion whose clipboard failure does not affect the Telegram handoff.

- [ ] **Step 1: Inventory user-visible `связь`, `мэтч`, unsupported nearby language, and foundation copy**

Do not mechanically rename internal domain identifiers.

- [ ] **Step 2: Add copy assertions for the entry promise**

```text
Какого разговора тебе сейчас не хватает?
Corens помогает найти человека, с которым такой разговор может состояться.
```

- [ ] **Step 3: Rewrite bot, intro, onboarding, connection, and Beacon copy**

Explain why intent, state, and Trust Keys improve fit or safety. Keep Beacon separate as ready-now mode without geolocation implications.

- [ ] **Step 4: Write failing tests for the universal starter pool and deterministic selection**

Assert the exact four strings from `docs/plans/2026-08-21-universal-conversation-starters-design.md`. Assert repeated calls with the same connection id return the same string, a representative set of ids reaches every pool item, and the selector accepts no state, intent, Trust Key, profile, or message input.

Run:

```bash
corepack pnpm exec vitest run tests/unit/conversation-starters.test.ts
```

Expected: FAIL because `apps/miniapp/src/lib/conversation-starters.ts` does not exist.

- [ ] **Step 5: Implement the universal selector and optional copy card**

Use a small stable string hash of `connectionId` modulo `UNIVERSAL_CONVERSATION_STARTERS.length`. Do not persist the selected string. Render `ConversationStarterCard` only inside the already-approved `connection.contactConsent.status === "approved"` branch and pass the selected string from `ConnectionDetailPage`.

The card copy is:

```text
Не знаешь, с чего начать?
Можно написать так:
```

Provide a `Скопировать` action and a non-blocking `Скопировано` acknowledgement. If `navigator.clipboard.writeText` is unavailable or rejects, leave the text selectable and show `Не получилось скопировать — текст можно выделить вручную.` Never disable or delay `Написать в Telegram`.

- [ ] **Step 6: Verify starter behavior and full copy slice**

Run:

```bash
corepack pnpm exec vitest run tests/unit/conversation-starters.test.ts
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

At mobile width, confirm the starter card appears only after mutual contact approval, remains readable, and does not displace or block `Написать в Telegram`.

- [ ] **Step 7: Run focused UI tests and final terminology checks**

Confirm there is no internal-chat promise and no implication that Corens observes private conversation content.

---

### Task 6: End-To-End Validation And Pilot Export

**Session goal:** Prove the critical flow and produce a privacy-safe cohort evidence artifact without a permanent admin product.

**Files:**
- Create or extend: `tests/e2e/conversation-feedback.spec.ts`
- Create: `apps/api/src/scripts/export-conversation-pilot.ts`
- Modify: root `package.json`
- Update canonical contracts and evidence only after checks pass

**Interfaces:**
- Produce `pnpm export:conversation-pilot -- --from <ISO-date> --to <ISO-date>`.
- Export aggregates counts and pseudonymous match ids, never Telegram ids, usernames, links, or free text.

- [ ] **Step 1: Write the deterministic end-to-end scenario**

```text
two users → one match → same-match mutual contact approval → one handoff open → due prompt → both answer talked/value/next intent → mutually_confirmed
```

Also test approvals from different matches and conflicting conversation reports.

- [ ] **Step 2: Write the export contract test**

Required aggregates: onboarding, matches, mutual approvals, contact opens, one-sided reports, mutual confirmations, value answers, next-intent answers, and non-conversation obstacles.

- [ ] **Step 3: Implement a read-only stdout JSON export**

Do not create an HTTP admin route unless separately approved.

- [ ] **Step 4: Run the complete verification loop**

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm exec playwright test tests/e2e/conversation-feedback.spec.ts
```

- [ ] **Step 5: Run `gitnexus_detect_changes()` and update documentation**

Mark events as implemented only after passing checks. Move `TODO.md` to Phase F only when Phase E Definition of Done is supported by evidence.

---

## Final Plan Self-Review

- The plan preserves bot + Mini App, state, intent, Trust Keys, Beacon, separate consent, Telegram handoff, and privacy.
- System-observed proxies and participant-reported outcomes remain distinct.
- Each task is independently testable and starts in a fresh session.
- Open technical choices remain in `docs/architecture/open-questions.md` until their implementation session resolves them.
