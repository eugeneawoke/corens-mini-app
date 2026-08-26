# SECURITY.md

## Purpose

Top-level security and privacy guardrails for the MVP scaffold.

## Threat Model Summary

- Unauthorized access to Telegram-authenticated sessions
- Improper exposure of consent-gated contact or photo data
- Abuse through repeated state, intent, trust-key, or Beacon changes
- Leakage of sensitive artifacts into logs or analytics
- Accidental collection of private Telegram conversation content during outcome validation
- Feedback spoofing across participants or match sessions
- Incomplete deletion or lingering access after deletion starts

## Sensitive Data Rules

Never log:

- raw Telegram init data
- Telegram bot token
- storage keys
- signed URLs
- Telegram deep-link artifacts
- session tokens/cookies or other session secrets
- raw report notes in ordinary application logs
- private Telegram message text, screenshots, or inferred conversation content
- raw conversation-feedback callback payloads when they contain internal match identifiers

Treat as sensitive:

- Telegram identifiers
- contact-reveal artifacts
- media storage metadata
- audit metadata that can identify actors
- match-scoped conversation-feedback records and contact-open timestamps

## Conversation Feedback Rules

- Resolve every bot answer to the authenticated Telegram actor and verify that actor belongs to the referenced match session.
- Never combine approvals or feedback from different match sessions.
- Store only allowlisted categorical answers in the validation release; no required free text.
- Use an opaque feedback token in Telegram callback data; never encode a Telegram identifier or raw match id there.
- Feedback persistence stores a unique server-generated opaque token and has no field for private message content or Telegram deep links.
- Feedback rows are foreign-keyed to the participant and match session with cascade deletion.
- Record contact handoff without logging or submitting the Telegram deep link itself.
- Analytics exports must exclude Telegram ids, usernames, links, raw callback data, and private message content.
- The pilot evidence export is a local read-only stdout command, not an HTTP route. It requires a secret of at least 32 characters and derives stable match pseudonyms with HMAC-SHA-256.
- Pilot export cohort labels are restricted to short slugs so operator-supplied labels cannot become a free-text data channel.
- The pilot export database query allowlists only match membership/timestamps, onboarding completion, consent status, contact-open timestamps, and categorical feedback fields.
- Delete or minimize feedback records through the same account-deletion and retention guarantees as other match-scoped data.

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

## Release Readiness

- Auth bootstrap and revoke flows must be documented before runtime release.
- Every protected route enforces the backend session guard; demo fallbacks are disallowed.
- Matching, consent, moderation, Beacon, and deletion transitions remain config-driven and deterministic.
