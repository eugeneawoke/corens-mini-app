# ANALYTICS.md

## Purpose

Top-level analytics contract for event families, funnel intent, and logging boundaries.

## Event Families

- onboarding
- profile
- matching
- beacon
- consent
- privacy
- deletion
- bot-notification

## Funnel Intent

- onboarding completion
- first profile-ready state
- no-match to Beacon activation
- match found to continue decision
- consent request to mutual resolution
- privacy action initiation to completion

## Do-Not-Log Overlap

Analytics must not include:

- deep-link artifacts
- signed URLs
- raw Telegram init data
- private photo storage keys
- free-text report notes unless explicitly scrubbed

## Ownership

- Human-readable event documentation lives here and in `docs/analytics/event-schema.md`
- Machine-readable event schema lives in `config/analytics/events.v1.yaml`
