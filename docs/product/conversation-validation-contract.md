# Conversation Validation Contract

_Canonical product definition for the next Corens validation cycle. Product decisions belong in `DECISIONS.md`; verified results belong in `EVIDENCE.md`._

## Product Wedge

Corens helps a person find one suitable person for the conversation they need now, establish enough trust to choose freely, and move the mutually accepted conversation into Telegram.

This is a focus for validating the existing product, not a replacement product and not a rejection of the broader Corens vision.

## What Is Already Supported

- The founder reports 20–30 conversations in which people reacted positively to the problem and concept.
- This supports problem resonance and initial desirability.
- It does not yet prove that the current flow repeatedly creates real, useful conversations.

## Validation Question

> Can Corens reliably turn a present need for a conversation into a mutually started and useful conversation with low friction and enough trust?

The next cycle is not intended to re-test whether people generally need human connection. It tests whether the current Corens mechanism delivers that outcome.

## Target Outcome

The primary outcome is a **mutually confirmed conversation**: both participants in the same `match session` independently report that a conversation took place.

Supporting outcomes:

1. A match was created.
2. Both participants approved contact reveal inside that same match session.
3. At least one participant opened the Telegram contact handoff.
4. One or both participants reported that a conversation happened.
5. Both participants independently confirmed that it happened.
6. Participants reported whether it matched the conversation they needed.
7. Participants stated whether they want another Corens introduction now, later, or not currently.

## Product Surfaces

### Telegram Bot

- Entry point and `/start` orientation.
- Match, consent, and follow-up notifications.
- Three-question post-handoff feedback sequence.
- Deep links into the exact Mini App connection when consent or safety decisions are required.

### Telegram Mini App

- Product introduction and onboarding.
- Current state, current intent, and Trust Keys.
- Match explanation and the current connection process.
- Separate mutual consent for contact and photo reveal.
- Privacy, blocking, reporting, and deletion controls.
- One optional universal opening-message suggestion after mutual contact approval.

### Telegram Direct Message

- The actual conversation happens outside Corens after mutual contact consent.
- Corens does not read, copy, or infer the contents of private Telegram conversations.

## Opening-Message Suggestions

After mutual contact approval exposes the Telegram handoff, the connection screen may show one optional suggestion from the approved universal copy pool in `docs/plans/2026-08-21-universal-conversation-starters-design.md`.

- Selection is deterministic for the connection so the suggestion does not change on refresh.
- Selection does not use state, intent, Trust Keys, profile text, inferred experience, or private conversation content.
- Corens does not send the message on a participant's behalf.
- The participant can copy, edit, ignore, or replace it in Telegram.
- Wording that claims understanding or similar experience remains out of scope without an explicit truthful signal.

## Signal Hierarchy

- `intent` is the primary expression of the conversation the person needs now.
- `state` provides current emotional context and affects conversational compatibility.
- `trust keys` provide stable fit and safety signals.

All three remain part of the product. The validation release may improve their copy, ordering, and matching weights, but must not remove them merely to shorten the flow.

## Consent Scope

Contact approval is not global. Each approval belongs to:

- one specific `matchSessionId`;
- one specific participant (`requestedBy`);
- the `contact` consent channel.

Mutual contact approval exists only when both participants have `approved` contact reveal for the same `matchSessionId`. Approval from another match session must never count.

## Feedback Sequence

The same sequence is sent independently to both participants.

### Question 1 — Outcome

> Что произошло после того, как вы оба согласились открыть контакт?

- Поговорили
- Я написал(а), но ответа не было
- Я не написал(а)
- Решил(а) не продолжать
- Возникла техническая проблема

### Question 2A — Value, if a conversation happened

> Насколько это был тот разговор, которого тебе не хватало?

- Да, именно тот
- Отчасти
- Нет

### Question 2B — Obstacle, if no conversation happened

> Что больше всего помешало начать разговор?

- Было не вовремя
- Человек или запрос не подошли
- Не знал(а), как начать
- Не хватило ощущения безопасности
- Помешала техническая проблема

### Question 3 — Next intent

> Хотел(а) бы ты, чтобы Corens подобрал следующий разговор?

- Да, сейчас
- Да, но позже
- Пока нет

### Completion

> Спасибо за обратную связь. Она помогает Corens находить не просто совпадения, а разговоры, которые действительно нужны.

No free-text answer is required in the validation release. An optional comment can be introduced later only if it has an explicit research purpose and a privacy-safe retention rule.

## Timing

- Record the first click on the Telegram contact handoff as a behavioral proxy, not as proof of conversation.
- Make the first feedback prompt due 24 hours after the first recorded contact handoff click.
- If no click is recorded, make the prompt due 48 hours after mutual contact approval.
- Do not send more than one active feedback sequence per participant and match session.
- Timing, reminders, retries, and expiration use the dedicated versioned `config/conversation-feedback/rules.v1.yaml` policy before runtime wiring.
- Telegram callback data uses an opaque feedback token, not a Telegram identifier or raw match id.

## Evidence Levels

| Level | Evidence | Meaning |
|---|---|---|
| 1 | Match created | System found a candidate |
| 2 | Mutual contact approval | Both accepted the handoff for the same match |
| 3 | Contact handoff opened | At least one person showed intent to act |
| 4 | One-sided conversation report | A participant says a conversation occurred |
| 5 | Mutual conversation confirmation | Both participants independently say it occurred |
| 6 | Reported conversation value | The conversation addressed the stated need fully or partly |
| 7 | Repeat request | The participant wants Corens to find another conversation |

Levels 1–3 are system-observed proxies. Levels 4–7 are self-reported outcomes. Private message content is never an evidence source.

## North Star And Diagnostics

**North Star:** mutually confirmed conversations per week.

Diagnostic funnel:

`onboarding completed → match created → mutual contact approval → contact handoff opened → conversation reported → conversation mutually confirmed → conversation useful → another conversation requested`

The first closed pilot establishes a baseline. Conversion thresholds must be set only after observing the first cohort rather than inventing universal benchmarks in advance.

## Validation Cohort

- Start with the founder's existing 20–30 interview contacts where appropriate.
- Run a coordinated closed cohort so both sides of potential matches are active within the same time window.
- Analyse behavior by match session, not only by user totals.
- Follow up qualitatively on failures and contradictions, especially when one participant reports a conversation and the other does not.

## In Scope For The Validation Release

- Clearer conversation-focused intro and onboarding copy.
- An optional universal opening-message suggestion after mutual contact approval.
- Existing state, intent, Trust Keys, matching, Beacon, consent, safety, privacy, and Telegram handoff.
- Match-scoped contact-open tracking.
- Match-scoped three-question bot feedback.
- Pair-level outcome aggregation without message-content access.
- Minimal operational view or export for the closed pilot.

## Out Of Scope

- Reading or analysing private Telegram messages.
- Internal Corens chat.
- AI conversation scenarios or coaching.
- Geolocation.
- Small-group matching in this validation cycle.
- Payments or subscription mechanics.
- A separate mobile application.
- Removing state, intent, or Trust Keys without behavioral evidence that they create harmful friction.

## Decision Rule After The Pilot

- Preserve elements that correlate with mutual, useful conversations.
- Rewrite elements users misunderstand.
- Remove elements only when observed friction is not compensated by trust or match quality.
- Treat compliments as qualitative context; prioritize completed behavior and independently reported outcomes.
