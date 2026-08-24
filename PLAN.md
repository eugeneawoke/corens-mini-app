# PLAN.md

_Current phase is marked explicitly. Update when phase scope changes._

## Current Phase: Phase E — Conversation Validation Release

**Status:** In progress  
**Goal:** Reframe the existing bot + Mini App flow around one needed conversation and add privacy-preserving evidence from contact handoff through mutually confirmed outcome.

**Current deliverable:** Match-scoped contact-open tracking, three-question bot feedback, and the conversation-focused product language required for a closed cohort.

The validation release does not replace the current architecture or remove state, intent, Trust Keys, Beacon, consent, photo reveal, privacy, or moderation. Phase C/D hardening remains a release gate where the new flow touches those systems.

## Phases

| # | Phase | Goal | Status |
|---|---|---|---|
| A | Runtime Sanitation and Auth Boundary | Remove demo fallbacks, drop `/home`, and ship the auth bootstrap/session boundary. | DONE |
| B | Auth + Session Layer | Validate Telegram init data, issue backend sessions, and guard all Mini App routes. | DONE |
| C | Deterministic Matching & Consent Hardening | Database-safe matching, config-backed policies, consent determinism, moderation, and deletion guarantees. | IN PROGRESS |
| D | Full Automated Test Pyramid | Unit, contract, integration, and Playwright e2e suites with deterministic seeds. | IN PROGRESS |
| E | Conversation Validation Release | Preserve the existing product while measuring whether it produces mutually confirmed, useful conversations. | IN PROGRESS |
| F | Closed Cohort Pilot | Run a coordinated cohort, starting with appropriate existing interview contacts, and establish the first behavioral baseline. | PLANNED |
| G | Evidence-Based Iteration | Change copy, activation, matching, or friction only from observed cohort evidence. | PLANNED |

## Phase E Scope

- Use `docs/product/conversation-validation-contract.md` as the canonical product definition.
- Keep Telegram Bot + Mini App + private Telegram direct-message handoff.
- Keep intent, state, and Trust Keys with clearer roles and copy.
- Scope contact approvals and feedback to one specific match session.
- Record first contact-handoff open as a proxy, never as proof of conversation.
- Ask both participants the three-question feedback sequence and thank them at completion.
- Show one optional universal opening-message suggestion after mutual contact approval without inferring topic or experience.
- Derive mutual confirmation only from two independent conversation reports in the same match session.
- Keep prompt timing, reminder, retry, and expiry rules in `config/conversation-feedback/rules.v1.yaml` and use the existing in-process scheduler.
- Add focused automated coverage and enough e2e coverage to trust the pilot data.

## Phase E Definition Of Done

- [x] The runtime records match-scoped mutual contact approval and first contact-handoff open without logging the deep link.
- [ ] Both participants receive at most one active feedback sequence for a match session.
- [x] The bot implements the three-question branching sequence and final thank-you.
- [ ] Pair aggregation distinguishes one-sided report, conflicting report, and mutual confirmation.
- [ ] Analytics events and persistence contain no private Telegram message content, usernames, user ids, or deep-link artifacts in exported properties.
- [ ] Conversation-focused intro/onboarding and connection copy are understandable without removing existing context signals.
- [ ] The connection screen offers one stable universal opening-message suggestion after mutual contact approval without blocking the Telegram handoff.
- [ ] Unit, contract, integration, and critical Telegram callback/e2e paths pass.
- [ ] A minimal pilot export or operational view can report the diagnostic funnel and North Star by cohort and match session.

## Phase F Definition Of Done

- [ ] A coordinated closed cohort has been invited and its sampling method is recorded.
- [ ] Funnel baselines are recorded from onboarding through mutual conversation confirmation.
- [ ] Non-conversation outcomes and pair-answer contradictions are reviewed qualitatively.
- [ ] Conversation value and next-intent answers are summarized without private message content.
- [ ] Results and limitations are written to `EVIDENCE.md`; hypotheses remain clearly separate.

## Release Guardrails

- `/connection` remains the primary Mini App process surface; the actual chat remains in Telegram.
- Matching, consent, Beacon, feedback timing, deletion, and moderation transitions remain deterministic and policy-backed.
- Auth and privacy controls remain release blockers, not optional polish.
- Existing user changes in matching and bot notifications must be preserved and impact-analysed before implementation.
- Each implementation task runs in a separate fresh session using `MASTER_PROMPT.md`.

## Acceptance Notes

- Business rules remain config-backed rather than buried in runtime services.
- The first cohort establishes baselines; it does not use invented universal conversion targets.
- Product simplification means clearer access and hierarchy, not automatic removal of the contextual matching thesis.
