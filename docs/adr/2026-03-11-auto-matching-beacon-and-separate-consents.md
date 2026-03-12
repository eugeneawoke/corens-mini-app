# ADR-0001: Auto-Matching, Beacon, and Separate Consents

## Status

Accepted

## Context

The MVP needs a clear interaction model for matching, manual fallback behavior, and reveal control across Telegram Bot and Mini App surfaces.

## Decision

- Primary matching is automatic and event-driven
- Beacon is the only manual matching-related mode and is activated only in the Mini App
- Contact consent and photo reveal are separate mutual consent flows
- Mutual contact consent reveals only a Telegram deep link
- Matching, Beacon, reveal, and retention rules remain config-backed

## Consequences

- Backend orchestration becomes the product source of truth
- Background orchestration can start in-process before being extracted into a separate runtime
- Client apps stay thinner and safer
- Internal chat remains out of scope for MVP
