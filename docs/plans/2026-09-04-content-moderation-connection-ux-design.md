# Content Moderation And Connection UX Design

## Outcome

Corens prevents unacceptable display names and profile descriptions from being saved, explains the applicable category without echoing the rejected content, and gives the user a contextual way to ask Support what the rule means. The connection list prioritizes conversations that are ready to continue, makes actionable consent states recognizable without increasing card height, and the connection detail exposes a peer bio when one exists.

This is an MVP safety and usability pass. It does not add an administrator dashboard, a recurring profile scan, automated account punishment, or a new connection lifecycle.

## Moderated Profile Fields

The API is the enforcement boundary for:

- `displayName` during onboarding;
- `about` whenever the profile bio is saved.

Rejected input must not reach a profile write. Existing length, structural, and option validation remains in force.

Rules live in one versioned repository configuration under `config/moderation/`. They cover Russian, English, common Russian transliteration and mixed-script/obfuscated variants in three product-facing categories:

1. abusive or unsafe language: profanity, insults, slurs, threats, and explicit sexual language;
2. contact details: URLs, Telegram links and handles, email addresses, phone numbers, and instructions to contact elsewhere;
3. advertising: commercial promotion, solicitation, sales, and recruitment-like calls to action.

The matcher normalizes case, Unicode, whitespace, separators, common leetspeak, and visually confusable Cyrillic/Latin characters. Whole-token and phrase rules are preferred over arbitrary substrings, and the configuration supports explicit exceptions so ordinary words are not rejected accidentally. The config stores categories and machine rules, not user submissions.

## Error Contract And Support

A rejected mutation returns a stable structured error with `code: "profile_content_rejected"`, a category, and safe user-facing copy. The UI names the category but never repeats the matched word or full rejected text:

- abusive or unsafe language: `Уберите грубые или оскорбительные выражения`;
- contact details: `Не добавляйте ссылки и контактные данные`;
- advertising: `Описание профиля нельзя использовать для рекламы`.

If more than one rule matches, abusive/unsafe content has priority, then contact details, then advertising.

There are exactly two new contextual `Задать вопрос поддержке` links:

- beneath the display-name error on onboarding, only after that field is rejected;
- beneath the bio error, only after that field is rejected.

Both open the existing Telegram Support destination with a generic, preselected moderation topic. The rejected text is never placed in the URL or Support message. The ordinary `Поддержка` navigation in profile remains separate and is not counted as one of these contextual error links.

## Existing Profiles

The known unacceptable profile has already been corrected manually. The release process performs one read-only check of existing non-empty display names and bios with the same rules. There is no recurring scan and no admin-facing violation browser in this MVP. Any findings are handled deliberately outside the automated request path.

## Connection Ordering

Active connection summaries are sorted deterministically before they reach the UI:

1. mutual contact approval (`contactConsent.status === "approved"`);
2. inbound unanswered request (`status === "pending"`, current decision pending, `peerRequested === true`);
3. every other active connection.

Within each group, newest match sessions appear first. Peer-deleted summaries remain safe fallback records and do not outrank active conversations.

## Connection Card States

Cards keep their existing dimensions and content density. No `Ждёт вашего ответа` text is added to the card.

- Mutual contact approval uses a calm green border/elevation and a compact open-lock icon.
- An inbound unanswered request uses a warm amber border/elevation and a compact response icon.
- Other active connections remain neutral.

Each state icon has a visually hidden accessible label, focus and contrast remain visible, and color is never the only signal. Once contact access is mutual, the green ready state replaces the amber incoming-request state; the card remains highlighted because the conversation is now actionable.

## Peer Bio

`ActiveConnectionSummary` includes `about: string | null` from the peer profile. The compact connection card does not show it. The connection detail screen renders a short `О себе` section only when the peer bio is non-empty; no empty placeholder is shown.

## Accessibility And Visual Direction

- Preserve the existing warm, organic, minimal Corens visual language, type, radii, and tokens.
- Do not introduce a new palette, font, component library, decorative animation, or dependency.
- Maintain 44 px touch targets, visible focus indicators, semantic error associations, screen-reader labels for state icons, and no horizontal overflow at 390 px.
- Verify the list and detail screens at 390×844 and 390×667.

## Acceptance Criteria

- The API rejects prohibited names and bios before persistence and accepts documented safe exceptions.
- Russian, English, transliterated, mixed-script, spaced, punctuated, and common leetspeak variants have focused coverage.
- Rejections expose stable structured categories and the agreed safe copy.
- The two contextual Support links appear only after their corresponding moderation rejection and never carry rejected input.
- Active connections follow the approved three-tier ordering and preserve newest-first order inside a tier.
- Mutual and incoming states remain compact, visibly distinct, and accessible.
- A filled peer bio is visible on connection detail; an empty bio is omitted.
- Focused tests, the full test suite, typecheck, build, privacy searches, mobile browser checks, and GitNexus change detection pass before merge and push.

