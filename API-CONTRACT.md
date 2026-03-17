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

- `POST /api/auth/bootstrap`: validate Telegram Mini App `initData`, issue a backend session, and return bootstrap payloads
- `POST /api/auth/revoke`: expire the session and return an unauthenticated state
- `GET /api/profile/summary`: aggregated profile payload for Profile, State/Intent, Trust Keys, Privacy, and Delete screens
- `POST /api/profile/onboarding`: complete first-run onboarding and unlock the rest of the Mini App
- `PATCH /api/profile/state-intent`: first-pass update shape for current `stateKey` and `intentKey`
- `PATCH /api/profile/trust-keys`: first-pass update shape for selected trust keys
- `PATCH /api/privacy/visibility`: hide or restore profile participation in new matching runs
- `GET /api/beacon/status`: current Beacon status payload
- `POST /api/beacon/activate`: activate Beacon and return the updated Beacon payload
- `GET /api/matching/current-connection`: current match-session preview payload for the Connection screen
- `GET /api/consents/contact`: current contact consent status for the active connection
- `POST /api/consents/contact`: update the local actor decision for contact consent
- `GET /api/consents/photo`: current photo reveal status for the active connection
- `POST /api/consents/photo`: update the local actor decision for photo reveal

## First-Pass Payload Notes

- The current implementation uses shared DTOs from `@corens/domain`
- Profile and onboarding payloads are Prisma-backed
- Profile controls for state, intent, trust keys, and visibility now write through to Prisma-backed storage
- Matching now creates and reads real `MatchSession` records from persisted profiles
- Beacon activation is backend-driven and uses config-backed duration/cooldown rules
- Consent endpoints now persist per-user decisions on top of the active `MatchSession`
- Mutual contact approval returns only a Telegram deep link, not a plain-text contact field
- The route shapes are intended to stay stable while matching and consent move from placeholders to real persistence-backed orchestration
- `/connection` is the canonical user surface after `/home` was removed to eliminate demo fallbacks
- Auth bootstrap/session guards anchor every Mini App request, and falling back to fabricated state is not permitted

## Auth

- Mini App requests start with `/api/auth/bootstrap`, which verifies the Telegram `initData` HMAC/freshness, then issues a signed session token or secure cookie.
- Every profile, matching, Beacon, consent, privacy, and delete route is protected by the backend session guard; placeholder/demo data is disallowed for unauthorized callers.
- Bot requests are authenticated via Telegram webhook secret verification.
- Internal maintenance hooks use the same backend deployment and are not user-session based.

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

## Release Readiness

- Every Mini App route rejects unauthenticated requests instead of supplying fabricated/demo data.
- `/connection` is the canonical user surface; `/home` is removed at the contract level.
- Release readiness depends on deterministic matching/consent/deletion transitions and the automated test matrix called out in the cleanup plan.
