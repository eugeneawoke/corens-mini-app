# Conversation Feedback Delivery Lease Design

## Goal

Prevent a process restart from permanently losing a conversation-feedback prompt that was claimed immediately before Telegram delivery, while preserving bounded retries, overlap protection, and the existing in-process maintenance runtime.

## Decision

Use a database-backed delivery lease. `promptClaimedAt` records a temporary claim; `promptedAt` records confirmed Telegram delivery only. The versioned feedback policy adds `claim_lease_minutes: 15`. A pending prompt is eligible when it is due, unexpired, incomplete, below the attempt limit, not delivered, and either unclaimed or claimed before the lease cutoff.

The maintenance sweep claims a candidate with a guarded update that matches its current attempt count and previous claim value. It then sends the existing outcome prompt with the existing opaque callback token. Success clears the claim and sets `promptedAt`; a thrown Telegram failure clears the claim while preserving the incremented attempt. A process crash leaves the claim in place until the lease expires, after which another sweep retries it.

## Guarantees And Trade-off

- Concurrent sweeps cannot claim the same candidate state twice.
- A known Telegram failure is retried on a later sweep, up to `max_prompt_attempts`.
- A crash before Telegram accepts the message no longer loses the prompt permanently.
- A crash after Telegram accepts the message but before `promptedAt` is stored can cause a later duplicate.
- Every retry reuses the same callback token, so duplicate messages address one logical, idempotent feedback sequence.
- Exactly-once delivery is not claimed because PostgreSQL and Telegram do not share a transaction.

## Data And Policy

- Add nullable `ConversationFeedback.promptClaimedAt DateTime?`.
- Keep `promptAttempts` as the number of acquired delivery claims.
- Keep `promptedAt` as confirmed delivery time.
- Add `delivery.claim_lease_minutes: 15` to `config/conversation-feedback/rules.v1.yaml`.
- Keep `delivery.max_prompt_attempts: 3` and the existing expiry window.

## Verification

Focused tests cover fresh-claim suppression, stale-claim recovery, claim state during Telegram delivery, successful finalization, known-failure release, overlapping sweeps, attempt limits, and expiry. Workspace tests, Prisma validation, typecheck, build, diff inspection, and GitNexus change detection remain required.
