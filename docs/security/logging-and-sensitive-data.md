# Logging and Sensitive Data

## Logging Boundaries

- redact or omit Telegram init-data payloads
- redact or omit contact reveal artifacts
- redact or omit storage keys and signed URLs
- avoid ordinary log sinks for free-text abuse report notes
- never log session tokens, HTTP-only cookies, or replayable session secrets
- keep Telegram deep-link artifacts out of standard logs and analytics

## Sensitive Flows

- contact reveal
- photo reveal
- deletion
- session issuance
- media access
- auth bootstrap/revoke

## Remaining Work

- Add structured log field conventions
- Add audit event taxonomy
- Add redaction test cases
- Confirm release readiness checklist (no `/home`, session guard, deterministic matching) before launch
