# API-CONTRACT.md

## Purpose

This file is the top-level summary of planned API boundaries. Detailed implementation notes may live in `docs/api/`, but this file stays canonical for endpoint groups, auth model, and error categories.

## Surfaces

- Public Mini App API: session bootstrap, profile reads/updates, Beacon controls, consent actions, privacy actions
- Telegram Bot webhook API: webhook ingestion and command orchestration inside the same backend runtime
- Internal maintenance surface: in-process maintenance and sweep hooks, not a separate public runtime
- Internal admin/service surface: not exposed in the current baseline

## Planned Endpoint Groups

- `auth/*`: Telegram Mini App init-data validation, backend session creation, session revoke
- `profile/*`: profile summary, state/intention/trust-keys updates, photo metadata, visibility settings
- `matching/*`: current connection card, continue/skip, no-match state
- `beacon/*`: activate, inspect active session, inspect cooldown
- `consents/*`: contact consent and photo reveal actions
- `privacy/*`: hide, restore, delete request
- `health/*`: readiness and liveness

## First-Pass Implemented Route Shapes

- `GET /api/home/summary`: compact home payload with current state, intent, beacon status, and current connection preview
- `GET /api/profile/summary`: aggregated profile payload for Profile, State/Intent, Trust Keys, Privacy, and Delete screens
- `PATCH /api/profile/state-intent`: first-pass update shape for current `stateKey` and `intentKey`
- `PATCH /api/profile/trust-keys`: first-pass update shape for selected trust keys
- `GET /api/beacon/status`: current Beacon status payload
- `POST /api/beacon/activate`: activate Beacon and return the updated Beacon payload
- `GET /api/matching/current-connection`: current match-session preview payload for the Connection screen
- `GET /api/consents/contact`: current contact consent status for the active connection
- `POST /api/consents/contact`: update the local actor decision for contact consent
- `GET /api/consents/photo`: current photo reveal status for the active connection
- `POST /api/consents/photo`: update the local actor decision for photo reveal

## First-Pass Payload Notes

- The current implementation uses shared DTOs from `@corens/domain`
- These payloads are currently served from an in-memory MVP demo store inside `apps/api`
- The route shapes are intended to stay stable while the backing storage moves from demo state to Prisma-backed persistence

## Auth

- Mini App requests are authenticated by validated Telegram init data and a backend session
- Bot requests are authenticated via Telegram webhook secret verification
- Internal maintenance hooks use the same backend deployment and are not user-session based

## Error Shape

The scaffold should standardize around:

- `code`: stable machine-readable error code
- `message`: safe human-readable summary
- `details`: optional structured context safe for the client
- `traceId`: request correlation identifier

## Non-Goals

- No final REST/OpenAPI spec yet
- No GraphQL surface
- No public admin API in Phase 0
