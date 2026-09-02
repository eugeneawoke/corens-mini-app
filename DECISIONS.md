# DECISIONS.md

_Store accepted decisions only. Hypotheses stay out until validated._

## Product and Architecture Defaults

### Modular backend shape

**Decision:** Use a modular monolith backend that serves both Telegram Bot and Telegram Mini App surfaces.  
**Why:** Matching, consent, privacy, media access, and audit must stay server-side and consistent.

### Primary stack

**Decision:** TypeScript, NestJS, grammY, Next.js 15, PostgreSQL, Prisma, lightweight Redis-backed limits, private object storage.  
**Why:** This is the approved MVP stack from the architecture package and keeps the repo AI-agent friendly.

### Zero-cost deployment mode

**Decision:** Use a zero-cost deployment baseline with one combined backend service for API plus Telegram bot webhook, while background maintenance runs in-process instead of a dedicated worker service.  
**Why:** This keeps infrastructure inside a $0 entrypoint without violating the MVP privacy model or introducing deployment-only architecture drift.

### Deployment provider split

**Decision:** Use the following provider split for the MVP baseline:
- 1 GitHub repository
- 1 Vercel project for `apps/miniapp`
- 1 Railway service for `apps/api`
- 1 Neon database for PostgreSQL
- 1 Upstash Redis instance
- 1 Backblaze B2 bucket for private media storage

**Why:** This keeps the deployment model simple, maps cleanly to the current monorepo/runtime split, avoids providers that immediately require a card for backend service setup, and preserves a real private media storage path for photo reveal.

### Matching interaction model

**Decision:** Primary matching is automatic and event-driven; Beacon is the only manual matching-related mode.  
**Why:** This preserves the MVP rule that matching is backend-orchestrated, with Beacon as a temporary fallback.

### Reveal model

**Decision:** Contact reveal and photo reveal are independent mutual consent flows.  
**Why:** Contact and media access must remain separately consent-gated.

### Contact handoff

**Decision:** After mutual contact consent, expose only a Telegram deep link.  
**Why:** The direct contact artifact stays protected and is not surfaced as a plain profile field.

### Rules as config

**Decision:** Matching matrices, scoring, cooldowns, Beacon rules, reveal rules, and retention policies must remain config-backed.  
**Why:** The architecture package explicitly forbids hardcoding these rules into services.

### MVP guardrails

**Decision:** No internal chat, no extra v2 features, no implicit architecture changes without updating this file and an ADR when needed.  
**Why:** Prevents scope drift and conflicting implementations.

### Conversation-focused validation wedge

**Decision:** The next validation release focuses Corens on helping one person find one suitable person for the conversation they need now. This is a product wedge inside the existing vision, not a replacement product.

**Why:** Existing qualitative feedback supports the importance of the problem, while the missing evidence concerns whether the current product reliably produces real, useful conversations.

### Preserve the contextual matching signals

**Decision:** Keep current intent, current state, and Trust Keys in the validation release. Treat intent as the primary current request, state as emotional context, and Trust Keys as stable fit and safety signals.

**Why:** The goal is to simplify access and language without removing the context and trust thesis before behavioral evidence shows that a signal is harmful.

### Bot, Mini App, and Telegram responsibilities

**Decision:** Keep the Telegram Bot plus Mini App architecture. The bot owns entry and follow-up notifications; the Mini App owns context, match explanation, consent, and safety; the actual conversation remains a private Telegram direct message.

**Why:** This preserves the existing privacy-first architecture and keeps the conversation in the channel users already use.

### Telegram notification acknowledgement

**Decision:** Match, consent-request, and connection-closed notifications remain in the Telegram bot until the participant opens that specific notification. Opening or authenticating the Mini App normally must not remove other notifications. Each notification uses an opaque actor-bound acknowledgement id; after its button opens the target Mini App page, Corens deletes only that Telegram message.

**Why:** Participants need timely, independently visible notifications without losing unread events when they open the app for another reason. Addressed acknowledgement preserves a clean bot history without blanket deletion or cross-user message access.

### Conversation outcome feedback

**Decision:** Validate post-handoff outcomes through a match-scoped, three-question bot sequence sent independently to both participants. The sequence records outcome, value or obstacle, and next-conversation intent, then thanks the participant.

**Why:** Contact reveal and link opening are behavioral proxies but cannot prove that a private Telegram conversation occurred.

### Feedback prompt delivery guarantee

**Decision:** Use a config-backed database lease for bounded at-least-once feedback-prompt delivery. A claim that is at least 15 minutes old may be recovered by another in-process maintenance sweep, attempts remain capped at three, and every retry reuses the same opaque callback token. `promptedAt` means confirmed Telegram delivery; `promptClaimedAt` is only a temporary claim.

**Why:** A pre-send permanent marker can silently lose pilot feedback after a process restart. PostgreSQL and Telegram do not share a transaction, so recovery prioritizes avoiding silent loss while accepting a rare duplicate message that still addresses one idempotent feedback sequence.

### Mutual conversation confirmation

**Decision:** Count a conversation as mutually confirmed only when both participants in the same `matchSessionId` independently report that it happened.

**Why:** Corens cannot and must not inspect private Telegram messages; independent pair-level self-report is the strongest privacy-preserving evidence available.

### Validation North Star

**Decision:** Use mutually confirmed conversations per week as the North Star for the closed validation cohort. Use onboarding, match, consent, contact-open, one-sided report, value, and repeat intent as diagnostic funnel measures.

**Why:** Registrations, matches, and contact reveals measure progress toward value, not the delivered human outcome itself.

### Universal conversation starters

**Decision:** After mutual contact approval, show one optional opening-message suggestion selected from the approved universal copy pool. Selection must not depend on inferred experience, conversation topic, current state, intent, Trust Keys, profile text, or private message content.

**Why:** A concrete first phrase can reduce the friction between opening a contact and starting a conversation, while universal wording avoids making unsupported claims such as `я тебя понимаю` or `у меня был похожий опыт`.

### Post-onboarding profile settings hierarchy

**Decision:** Use `/profile` as a compact settings overview with a gender-neutral identity header, real search-visibility status, read-only bio preview, concise context/search/account groups, and dedicated full-screen editors. Individual context rows edit only their named value; `Изменить весь контекст` is the only sequential intent → state → Trust Keys flow. `Кого искать` remains outside context editing. Own gender is omitted from the overview and may be changed only through a protected confirmation flow inside search settings. Display-name correction is routed through common Support requests rather than an adjacent profile action.

**Why:** The current profile is an understandable but oversized editing wall. Progressive disclosure makes the current state scannable, avoids nested scrolling, preserves the contextual matching signals, and keeps identity-sensitive changes deliberate without representing gender through ambiguous icons or silhouettes.
