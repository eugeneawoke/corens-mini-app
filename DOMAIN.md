# DOMAIN.md

## Purpose

Canonical glossary for core MVP terms and invariants.

## Terms

- `state`: the user's current mood/state used in matching compatibility
- `intent`: the user's current social intent, updated on a shorter cooldown than state
- `trust key`: one of the user's selected trust signals used for overlap checks
- `match session`: the core pair-level connection record between two users
- `Beacon`: a manual, temporary search-related mode with fixed durations, cooldown, and daily limit
- `contact consent`: mutual consent flow that can reveal only a Telegram deep link
- `photo reveal`: mutual consent flow that can reveal profile photos independently from contact consent
- `hidden profile`: a profile excluded from new matching without auto-closing already found pending connections
- `deletion event`: the tracked lifecycle of profile deletion and cleanup

## Invariants

- Matching is automatic by default
- Beacon is opt-in and Mini App only
- Contact and photo reveal are separate flows
- Consent-gated artifacts stay server-controlled
- Config files define compatibility and policy-backed rules
