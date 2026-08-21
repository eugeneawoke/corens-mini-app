# DOMAIN.md

## Purpose

Canonical glossary for core MVP terms and invariants.

## Terms

- `conversation request`: the conversation a person needs now; represented primarily by current intent in the validation release
- `state`: the user's current emotional context used in matching compatibility
- `intent`: the user's current conversation intent, updated on a shorter cooldown than state
- `trust key`: one of the user's selected stable fit and safety signals used for overlap checks
- `match session`: the core pair-level introduction record between two users; all consent and conversation feedback is scoped to its id
- `Beacon`: a manual, temporary search-related mode with fixed durations, cooldown, and daily limit
- `contact consent`: mutual consent flow that can reveal only a Telegram deep link
- `mutual contact approval`: two contact approvals from the two participants inside the same match session
- `contact handoff`: opening the consent-gated Telegram deep link; a behavioral proxy, not proof of conversation
- `reported conversation`: one participant reports that a conversation happened
- `mutually confirmed conversation`: both participants in the same match session independently report that a conversation happened
- `conversation feedback`: the match-scoped three-question outcome, value/obstacle, and next-intent sequence sent by the bot
- `conversation pair status`: derived feedback state; `awaiting_reports`, `one_sided_report`, `conflicting_reports`, or `mutually_confirmed`
- `photo reveal`: mutual consent flow that can reveal profile photos independently from contact consent
- `hidden profile`: a profile excluded from new matching without auto-closing already found pending connections
- `deletion event`: the tracked lifecycle of profile deletion and cleanup

## Invariants

- Matching is automatic by default
- Beacon is opt-in and Mini App only
- Contact and photo reveal are separate flows
- Contact approvals from different match sessions can never form mutual approval
- Conversation feedback is participant-scoped and match-session-scoped
- Conversation feedback persistence contains at most one record per participant and match session
- Pair status ignores reports from other match sessions and requires two distinct `talked` reporters for mutual confirmation
- Private Telegram message content is never collected as product evidence
- Consent-gated artifacts stay server-controlled
- Config files define compatibility and policy-backed rules
