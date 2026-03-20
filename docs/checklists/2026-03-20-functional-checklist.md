# Functional Checklist

## Sources of truth

- `PLAN.md`
- `TODO.md`
- `DECISIONS.md`
- `EVIDENCE.md`
- `docs/architecture/mvp-architecture.md`
- `docs/architecture/open-questions.md`
- `/Users/eugene.gusakov/Documents/self-projects/corens/docs/matching-spec.md`
- `config/matching/*.v1.yaml`
- `config/beacon/rules.v1.yaml`
- `config/reveal/rules.v1.yaml`
- `config/privacy/rules.v1.yaml`

## Matching

- User finished onboarding.
- User has exactly 3 trust keys selected from the canonical 12.
- User can set one active state only.
- Light and shadow states are the canonical 11 from the spec.
- Intent uses the canonical 5 values, and empty intent does not block matching.
- User with 0 shared trust keys never enters the candidate pool.
- User with 1, 2, 3 shared trust keys gets `+2`, `+4`, `+6`.
- `lively` and `playful` never match any shadow state.
- `open` matches every shadow state with `mood_score = 2`.
- `after_heavy + fragile` is rejected.
- State matrix is symmetric in both directions.
- Intent matrix is symmetric in both directions.
- If one side has no intent, match is still allowed and `intent_score = 0`.
- If initiator has 10 active connections, API rejects matching attempt.
- If candidate has 10 active connections, candidate is excluded.
- Existing active pair is never recreated.
- Pair key is deterministic and conflict-safe for `A:B` and `B:A`.
- Matching score includes mood, intent, trust overlap, free-user bonus, fresh-mood bonus.
- Fresh mood bonus uses the configured freshness window.
- Tie on score does not break determinism unexpectedly.
- Empty pool returns Beacon fallback instead of creating invalid connection.
- Hidden profile is excluded from new matches.
- Disabled matching excludes the candidate from new matches.

## Onboarding

- First launch without completed onboarding redirects to `/onboarding`.
- Name shorter than 2 chars is rejected.
- Invalid state key is rejected.
- Invalid intent key is rejected.
- Trust keys fewer or greater than 3 are rejected.
- After successful onboarding user lands on the main flow, not a demo screen.
- Onboarding cards show the canonical state and intent copy from the matching spec.

## Connection

- `/connection` opens only after onboarding.
- Without active match screen shows waiting state and Beacon CTA.
- With active match screen shows shared trust keys and compatibility copy.
- Contact consent and photo consent stay separate.
- Contact reveal exposes only Telegram deep link after mutual approval.
- Photo reveal does not unlock contact reveal and vice versa.
- Deleted peer closes the connection and returns the user to search.

## Beacon

- Beacon can be activated manually only.
- Beacon activation requires a valid session.
- Beacon does not replace automatic matching.
- Active Beacon state shows remaining time.
- Cooldown prevents reactivation before allowed time.
- Daily activation limit is enforced.

## Privacy and moderation

- Hide profile removes the user from new matches.
- Delete request revokes session immediately.
- Delete request expires Beacon immediately.
- Delete request closes open consents immediately.
- Blocking a peer closes the connection and prevents further progress in that flow.
- Report flow stores note and keeps rate limit.

## Session and routing

- Missing or expired Mini App session redirects to auth bootstrap.
- Backend 401/403 clears the happy path and does not expose protected content.
- `/connection` remains the primary post-onboarding surface.
- No `/home` or demo fallback is used in real runtime.

## UI regression checks

- Buttons and link-buttons do not show rectangular tap highlight on press.
- `focus-visible` is present and subtle, not the browser default artifact.
- State cards are compact bento tiles, not oversized panels.
- Shadow-state cards are visually distinct from light-state cards.
- Trust-key chips remain chip-based and readable on mobile.
- Selected card state does not create oversized glow or clipping artifacts.
- Layout remains one-column on narrow mobile widths.
