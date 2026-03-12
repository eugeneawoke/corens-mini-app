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
- `consent.photo_requested`
- `consent.photo_resolved`
- `privacy.hidden`
- `privacy.restored`
- `privacy.delete_requested`

## Notes

- Do not store deep links, signed URLs, or raw init-data in analytics payloads.
