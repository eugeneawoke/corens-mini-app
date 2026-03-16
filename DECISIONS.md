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
