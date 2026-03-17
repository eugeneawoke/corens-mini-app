# PLAN.md

_Current phase is marked explicitly. Update when phase scope changes._

## Current Phase: Phase C - Deterministic Matching & Consent Hardening

**Status:** In progress  
**Goal:** Harden active match, consent, moderation, deletion, and retention flows now that the auth/session boundary is live.  
**Current deliverable:** Deterministic matching pair constraints, transactional closeout paths, and config-backed consent/privacy runtime.

## Phases

| # | Phase | Goal | Status |
|---|---|---|---|
| A | Runtime Sanitation and Auth Boundary | Remove demo fallbacks, drop `/home`, and ship the auth bootstrap/session boundary. | DONE |
| B | Auth + Session Layer | Validate Telegram init data, issue backend sessions, and guard all Mini App routes. | DONE |
| C | Deterministic Matching & Consent Hardening | Database-safe matching, config-backed policies, consent determinism, moderation, and deletion guarantees. | IN PROGRESS |
| D | Full Automated Test Pyramid | Unit, contract, integration, and Playwright e2e suites run with deterministic seeds for auth, matching, consent, and delete flows. | IN PROGRESS |
| E | Release Readiness & Documentation | Document readiness sign-off, refresh governance, and re-baseline phases/evidence before launch. | PLANNED |

## Phase C Deliverables

- Keep one active match per user pair through a DB-backed pair key and conflict-safe create path.
- Keep reveal rules config-backed instead of hardcoded in consent runtime.
- Make deletion and moderation closeout paths transactional and idempotent.
- Preserve the privacy-first zero-cost architecture while hardening runtime determinism.

## Release Readiness Checklist

- Auth bootstrap and session revoke endpoints exist and guard Mini App traffic.
- `/connection` remains the primary surface; `/home` and demo fallbacks are removed.
- Matching, consent, Beacon, deletion, and moderation flows are config-driven and deterministic.
- Logging scrubs init data, session secrets, deep links, and abuse notes.
- Test suites span unit, contract, integration, and e2e with deterministic seeds.

## Acceptance Notes

- Repository structure continues to reflect the approved architecture package.
- Business rules remain config-backed and not hardcoded into runtime services.
- Scope centers on runtime sanity, auth guardrails, and release-readiness documentation.
