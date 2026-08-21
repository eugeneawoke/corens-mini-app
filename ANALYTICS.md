# ANALYTICS.md

## Purpose

Top-level analytics contract for deciding whether Corens produces real, useful conversations while preserving private Telegram communication.

## North Star

`mutually_confirmed_conversations_per_week`: count of match sessions for which both participants independently report that a conversation happened.

The first closed cohort establishes a baseline. No universal conversion target is assumed before that cohort is observed.

## Event Families

- onboarding
- profile
- matching
- beacon
- consent
- privacy
- deletion
- bot-notification
- contact-handoff
- conversation-feedback

## Funnel Intent

- onboarding completion
- first profile-ready state
- no-match to Beacon activation
- match found to continue decision
- consent request to mutual resolution
- mutual contact approval to first contact-handoff open
- contact handoff to one-sided and mutual conversation confirmation
- conversation confirmation to reported value and next-conversation intent
- privacy action initiation to completion

## Evidence Ladder

1. `matching.candidate_found`
2. `consent.contact_mutually_approved` for one `matchSessionId`
3. `handoff.contact_opened`
4. `feedback.conversation_reported`
5. `feedback.conversation_mutually_confirmed`
6. `feedback.conversation_value_submitted`
7. `feedback.next_intent_submitted`

Levels 1–3 are system-observed proxies. Levels 4–7 are participant-reported outcomes.

## Feedback Sequence

The bot asks both participants independently:

1. What happened after the contact opened?
2. If they talked, how closely did the conversation match the need; otherwise, what blocked it?
3. Do they want Corens to find another conversation now, later, or not currently?

The sequence ends with a thank-you. The validation release does not require free text.

## Timing Contract

- First prompt due 24 hours after the first recorded contact-handoff click.
- Fallback due 48 hours after mutual contact approval when no click is recorded.
- One active feedback sequence per participant and match session.
- Timing, reminder, retry, and expiry use the dedicated versioned `config/conversation-feedback/rules.v1.yaml` policy before runtime wiring.

## Implementation Status

- Match-scoped participant feedback persistence and pair-status derivation are implemented.
- The runtime does not yet record handoff opens, emit feedback analytics events, deliver prompts, or handle bot answers.

## Interpretation Rules

- Two contact approvals count as mutual only when they belong to the same `matchSessionId` and different participants.
- A contact-open event does not prove that a message was sent.
- A one-sided report does not qualify as a mutually confirmed conversation.
- Conflicting pair answers remain visible as a research signal and must not be silently coerced into confirmation.

## Do-Not-Log Overlap

Analytics must not include:

- deep-link artifacts
- signed URLs
- raw Telegram init data
- private photo storage keys
- free-text report notes unless explicitly scrubbed
- private Telegram message content or metadata not already required for the product
- Telegram usernames, user ids, or deep-link values in analytics event properties
- optional conversation feedback comments until a specific research and retention policy is approved

## Ownership

- Human-readable event documentation lives here and in `docs/analytics/event-schema.md`
- Machine-readable event schema lives in `config/analytics/events.v1.yaml`
