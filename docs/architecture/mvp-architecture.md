# MVP Architecture

## Goal

Build `corens` v1 as a modular backend that serves Telegram Bot and Telegram Mini App surfaces with server-controlled matching, consent, privacy, and audit.

## Main Surfaces

- `apps/api`: source-of-truth HTTP/API boundary plus Telegram bot webhook runtime
- `apps/miniapp`: primary user interface

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
- privacy and access control override speed of implementation
- deployment stays compatible with a zero-cost baseline by avoiding a dedicated worker runtime
