# Telegram Notification Reliability Design

## Problem

Production does not set `ENABLE_MAINTENANCE_SCHEDULER`, whose default is `false`. New matches are therefore commonly created only when `GET /api/matching/connections` runs while the Mini App is opening. Match creation sends a Telegram notification, but auth bootstrap and `/connection` then run blanket notification cleanup and delete every tracked bot message. This explains the observed sequence: a notification appears during Mini App opening and immediately disappears.

The same blanket cleanup can erase contact/photo-opening requests and connection-closed notices that the user did not open. Automatic match expiry has another gap: it closes the session but notifies neither participant.

## Required Behavior

- Production matching runs from the existing in-process maintenance scheduler so new-match notifications do not depend on opening the Mini App.
- Every ordinary notification contains an opaque notification id in its Mini App URL.
- Opening a notification deletes only that Telegram message after the target page becomes visible.
- Opening the Mini App normally does not delete any notification.
- Auth bootstrap never performs blanket cleanup.
- Notification acknowledgement is actor-bound: one Telegram user cannot delete another user's message by copying a notification id.
- Repeating the same contact/photo approval does not send duplicate requests.
- Manual close continues to notify the peer. Automatic expiry notifies both participants once after a guarded state transition.
- Report remains silent to the target; block keeps its neutral closure notice.
- The existing feedback-prompt lease/retry flow is unchanged.

## Addressed Notification Flow

`BotNotificationService.send()` generates a cryptographically opaque UUID before delivery, appends it as `notificationId` to the existing exact Mini App URL, sends the Telegram message, and persists the same UUID as `BotNotificationMessage.id` together with the Telegram user and message id.

Both `/connection` and `/connection/[id]` accept the optional query parameter and mount `NotificationCleanup` only when it is present. The client component calls the authenticated cleanup action after mount. The API locates the tracking record by both `notificationId` and the authenticated user's `telegramUserId`, deletes that exact Telegram message, then removes its tracking row. Well-formed stale or foreign ids are a no-op; malformed ids are rejected before lookup.

The old blanket cleanup is removed from auth bootstrap and routine page loading. Its internal service method remains only for the explicit reset/service-message workflow.

## Matching And Consent

The existing five-minute maintenance scheduler remains the zero-cost background runtime. Railway production must explicitly set `ENABLE_MAINTENANCE_SCHEDULER=true` before release. On-demand match fill remains a recovery path.

Consent notification delivery becomes edge-triggered: only a stored transition from a non-approved state into `approved` sends the peer request. Mutual contact approval and feedback creation remain match-scoped and unchanged.

Expiry uses a guarded `updateMany` constrained to an active, stale session. Only the caller that wins the transition closes pending consents and sends one neutral notification to each participant. This prevents overlapping sweeps or Mini App requests from duplicating expiry messages.

## Verification

Tests must prove opaque exact URLs, deletion of one owned message only, no auth blanket cleanup, no cleanup without a notification id, idempotent consent requests, and single delivery to both participants on concurrent expiry. The release gate is focused Vitest, the full test suite, typecheck, build, the conversation-feedback Playwright scenario, privacy searches, and GitNexus change detection. Railway configuration and deployment require a separate explicit release authorization.
