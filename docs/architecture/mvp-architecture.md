# MVP Architecture

## Goal

Build `corens` v1 as a modular backend that serves Telegram Bot and Telegram Mini App surfaces with server-controlled matching, consent, privacy, and audit.

## Main Surfaces

- `apps/api`: source-of-truth HTTP/API boundary plus Telegram bot webhook runtime
- `apps/miniapp`: primary user interface

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
