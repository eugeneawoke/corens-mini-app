# Universal Conversation Starters Design

**Status:** Accepted for Phase E / Session 5
**Product owner:** `docs/product/conversation-validation-contract.md`
**Implementation plan:** `docs/superpowers/plans/2026-08-14-conversation-validation.md`, Task 5

## Outcome

After mutual contact approval makes the Telegram handoff available, Corens shows one optional opening-message suggestion. The suggestion reduces the friction of starting a private Telegram conversation without pretending to know what either participant is experiencing.

The actual message is still written and sent by the participant in Telegram. Corens does not send a message on the participant's behalf and does not read the resulting conversation.

## Approved Copy Pool

1. `Привет. Хочешь немного поговорить? Можем начать с любой темы. Можно не подбирать правильные слова.`
2. `Привет. Хочешь немного поговорить? С чего тебе было бы проще начать? Я готов тебя послушать.`
3. `Привет. Хочешь немного поговорить? Можешь просто рассказать, что сейчас происходит.`
4. `Привет. Если хочешь, можем немного поговорить. Необязательно сразу объяснять всё.`

## Selection Rule

- Use only this universal pool in the validation release.
- Select one suggestion deterministically from the current connection id so it feels varied across connections but does not change on refresh.
- Do not use state, intent, Trust Keys, profile text, message text, or inferred experience to select a suggestion.
- Do not create categories such as `хочет быть услышанным`, `я тебя вижу`, or `похожий опыт` until the product collects an explicit, approved signal that makes such wording truthful.

## Placement And Interaction

- Show the suggestion only when mutual contact approval has exposed the Telegram handoff.
- Place it beside the `Написать в Telegram` action on the connection detail screen.
- Label it as an optional starting point, not as a message from Corens.
- Allow the participant to copy the text. Clipboard failure must leave the suggestion readable and must never prevent the Telegram handoff.
- The participant may edit or ignore the suggestion after moving to Telegram.

## Privacy And Analytics

- Do not persist the selected suggestion or copied text.
- Do not include the suggestion text in analytics.
- If copy interaction is measured, record only a categorical `starter_copied` event scoped to the match session using the existing privacy rules; event tracking is not required for the first implementation slice.
- Never infer whether the suggestion was sent or whether it started a conversation.

## Acceptance Criteria

- Exactly four approved universal suggestions exist in one source file.
- The same connection id produces the same suggestion across repeated renders.
- Different connection ids can produce different suggestions.
- No selection branch reads state, intent, Trust Keys, biography, or conversation content.
- The suggestion appears only after mutual contact approval and remains optional.
- Copy failure does not block `Написать в Telegram`.
- Focused unit tests, typecheck, build, and a mobile-width browser check pass.
