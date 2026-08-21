# ADR-0002: Privacy-Preserving Conversation Outcome Feedback

## Status

Accepted

## Context

Mutual contact approval and a Telegram deep-link handoff show intent, but they do not prove that participants started or valued a conversation. The actual exchange happens in a private Telegram direct message that Corens cannot and should not inspect.

## Decision

- Keep the actual conversation in Telegram direct messages.
- Store one conversation-feedback record per participant and `matchSessionId`.
- Treat contact-handoff opening as a system-observed proxy only.
- Ask each participant three categorical questions through the bot: outcome, value or obstacle, and next-conversation intent.
- End the sequence with a thank-you and require no free text in the validation release.
- Derive a mutually confirmed conversation only from two distinct `talked` reports in the same match session.
- Schedule delayed prompts through the existing combined `apps/api` runtime and in-process maintenance baseline.
- Keep timing, reminder, retry, and expiry rules in a dedicated versioned `config/conversation-feedback/rules.v1.yaml` policy before runtime wiring.
- Use an opaque per-feedback callback token rather than putting a match id or Telegram identifier into callback data.

## Consequences

- Corens can measure delivered conversational outcomes without reading message content.
- Contact approval, contact opening, one-sided report, and mutual confirmation remain separate evidence levels.
- Telegram callback handling must authenticate the actor and verify match participation.
- Feedback data must participate in deletion, retention, and privacy controls.
- The implementation adds persistence, bot callbacks, maintenance work, tests, and pilot reporting, but no internal chat or standalone worker.
