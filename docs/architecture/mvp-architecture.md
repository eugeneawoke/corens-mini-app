# MVP Architecture

## Goal

Build `corens` v1 as a modular backend that serves Telegram Bot and Telegram Mini App surfaces with server-controlled matching, consent, privacy, and audit.

## Main Surfaces

- `apps/api`: source-of-truth HTTP/API boundary plus Telegram bot webhook runtime
- `apps/miniapp`: primary user interface
- Telegram direct messages: private conversation surface after mutual contact approval; not observed by Corens

## Validation Flow

`Bot entry/notification → Mini App context and consent → Telegram contact handoff → private direct message → Bot outcome feedback`

- The bot owns entry, notifications, and post-handoff feedback.
- The Mini App owns context, match explanation, mutual consent, and safety controls.
- Conversation feedback is scoped to participant plus match session.
- Delayed prompts reuse the in-process maintenance baseline; no standalone worker runtime is introduced.

## Deployment Baseline

- GitHub: single repository for the monorepo
- Vercel: deploy `apps/miniapp`
- Railway: deploy the combined `apps/api` runtime
- Neon: PostgreSQL
- Upstash: Redis-backed limits and short-lived runtime state
- Backblaze B2: private media/object storage

## Shared Layers

- `packages/domain`: shared contracts and domain vocabulary
- `packages/config`: config schemas and loaders
- `packages/db`: Prisma schema and persistence boundary
- `packages/telegram`: Telegram-specific helpers

## Guardrails

- auto-matching stays backend-driven
- Beacon is temporary and manual
- contact and photo reveal remain separate flows
- contact approvals and conversation feedback remain scoped to one match session
- private Telegram message content is never collected
- privacy and access control override speed of implementation
- deployment stays compatible with a zero-cost baseline by avoiding a dedicated worker runtime
