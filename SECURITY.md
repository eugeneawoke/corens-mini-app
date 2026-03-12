# SECURITY.md

## Purpose

Top-level security and privacy guardrails for the MVP scaffold.

## Threat Model Summary

- Unauthorized access to Telegram-authenticated sessions
- Improper exposure of consent-gated contact or photo data
- Abuse through repeated state, intent, trust-key, or Beacon changes
- Leakage of sensitive artifacts into logs or analytics
- Incomplete deletion or lingering access after deletion starts

## Sensitive Data Rules

Never log:

- raw Telegram init data
- Telegram bot token
- storage keys
- signed URLs
- Telegram deep-link artifacts
- raw report notes in ordinary application logs

Treat as sensitive:

- Telegram identifiers
- contact-reveal artifacts
- media storage metadata
- audit metadata that can identify actors

## Deletion Rules

Deletion flow must:

1. Hide the user immediately
2. Disable matching participation
3. Revoke active sessions
4. Expire Beacon if active
5. Close open consents
6. Delete media bytes before final data purge
7. Retain only the minimum tombstone and audit-safe residue

## Auth Rules

- Mini App auth is based on Telegram init-data validation with freshness checks
- Bot webhook must verify the shared secret
- Backend remains the only source of truth for reveal and media access across both Mini App API and bot webhook traffic

## Operational Notes

- Signed URLs must be short-lived
- Deep-link artifacts must be treated as consent-gated secrets
- Privacy and deletion behavior must remain server-enforced
