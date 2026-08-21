# Analytics Event Schema

## Scope

This document tracks human-readable analytics event definitions. The machine-readable companion lives in `config/analytics/events.v1.yaml`.

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

## Starter Events

- `onboarding.completed`
- `profile.state_updated`
- `profile.intent_updated`
- `profile.trust_keys_updated`
- `matching.recompute_requested`
- `matching.candidate_found`
- `beacon.activated`
- `beacon.expired`
- `consent.contact_requested`
- `consent.contact_resolved`
- `consent.contact_mutually_approved`
- `consent.photo_requested`
- `consent.photo_resolved`
- `handoff.contact_opened`
- `feedback.prompted`
- `feedback.conversation_reported`
- `feedback.obstacle_submitted`
- `feedback.conversation_value_submitted`
- `feedback.next_intent_submitted`
- `feedback.completed`
- `feedback.conversation_mutually_confirmed`
- `privacy.hidden`
- `privacy.restored`
- `privacy.delete_requested`

## Notes

- Do not store deep links, signed URLs, or raw init-data in analytics payloads.
- Conversation-feedback persistence is implemented, but these events are planned and are not emitted by the current runtime yet.
- Every feedback event is scoped internally to a match session and participant, but exported analytics must use non-contact identifiers and must not contain Telegram usernames or ids.
- `feedback.conversation_mutually_confirmed` is derived only when both distinct participants in the same match session report a conversation.
