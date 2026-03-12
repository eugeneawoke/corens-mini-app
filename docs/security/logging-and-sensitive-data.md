# Logging and Sensitive Data

## Logging Boundaries

- redact or omit Telegram init-data payloads
- redact or omit contact reveal artifacts
- redact or omit storage keys and signed URLs
- avoid ordinary log sinks for free-text abuse report notes

## Sensitive Flows

- contact reveal
- photo reveal
- deletion
- session issuance
- media access

## Remaining Work

- Add structured log field conventions
- Add audit event taxonomy
- Add redaction test cases
