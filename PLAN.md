# PLAN.md

_Current phase is marked explicitly. Update when phase scope changes._

## Current Phase: Phase 0 - Architecture Foundation

**Status:** In progress  
**Goal:** Create the starter repository scaffold, shared contracts, and platform boundaries.  
**Current deliverable:** Runnable zero-cost foundation with a combined API plus bot service on top of the scaffold and critical logic shells.

## Phases

| # | Phase | Goal | Status |
|---|---|---|---|
| 0 | Architecture Foundation | Monorepo, combined backend shell, Telegram auth validation shell, config system | IN PROGRESS |
| 1 | Bot Onboarding | Full onboarding flow through Telegram Bot | NEXT |
| 2 | Mini App Shell + Profile Controls | Profile summary, editors, visibility controls, delete shell | PLANNED |
| 3 | Automatic Matching + Beacon | Background matching, no-match fallback, Beacon orchestration | PLANNED |
| 4 | Contact Consent + Photo Reveal | Separate mutual consent flows and Telegram handoff | PLANNED |
| 5 | Privacy, Moderation, Hardening | Audit, analytics, abuse protection, deletion workflow | PLANNED |

## Phase 0 Deliverables

- Root governance files and session protocol
- Monorepo structure under `apps/`, `packages/`, `config/`, `docs/`
- Backend and mini app skeletons
- Shared domain types, config loaders, and DB schema scaffold
- Security, env, analytics, ADR, and migration templates
- Skeleton critical logic for matching, consent, and privacy
- Runnable combined API plus bot bootstrap

## Acceptance Notes

- Repository structure reflects the approved architecture package
- Business rules are not hardcoded into app services
- Scope remains limited to scaffold, critical logic shells, and zero-cost runnable foundation
