# Profile Settings Redesign Design

## Outcome

After onboarding, `/profile` becomes a compact settings overview instead of a long editing form. It shows the user's current conversation context and search state at a glance, while every change happens on a dedicated full-screen route.

This is an information-hierarchy redesign of existing MVP capabilities. It does not change the matching thesis, add a public profile feed, alter active connections, or introduce new identity fields.

## Profile Overview

The header is an identity summary, not an editor:

```text
[neutral avatar]  Женя                         В поиске
                  @username

Короткое описание
```

- Use one gender-neutral placeholder avatar until a separate approved photo-profile design exists.
- Do not encode gender through different silhouettes, `♂/♀`, color, or an icon.
- Do not show gender in the header.
- The display name and Telegram handle are read-only on this surface and have no lock, chevron, or adjacent correction action.
- The Telegram handle remains sourced from Telegram.
- The bio is a read-only one-to-three-line preview. Tapping the preview or its row opens a full-screen editor; the overview never contains an always-open textarea.
- The status badge is derived from `privacy.visibility`, not hardcoded. Visible profiles show `В поиске`; hidden profiles show `Не в поиске` with a neutral tone.

The overview then uses three compact groups:

```text
ВАШ КОНТЕКСТ
Разговор сейчас · <текущее намерение>              ›
Состояние · <текущее состояние>                    ›
Ключи доверия · <до трёх ключей, затем +N>          ›

                 Изменить весь контекст

НАСТРОЙКИ ПОИСКА
Кого искать · <текущее предпочтение>               ›
Видимость · <показываюсь / профиль скрыт>           ›

АККАУНТ
Приватность                                         ›
Поддержка                                           ›
Удаление аккаунта                                   ›
```

The current connection stays on `/connection`; it is not duplicated in profile settings.

## Editing Model

Each context row edits only the value it names:

- `Разговор сейчас` opens an intent-only full-screen editor.
- `Состояние` opens a state-only full-screen editor.
- `Ключи доверия` opens the existing selector as a full-screen editor.
- `Изменить весь контекст` opens one three-step full-screen flow in the order conversation → state → Trust Keys. Back preserves the draft; the final action saves all three values together.
- `Кого искать` remains separate from context editing.

Editors reuse the onboarding choice language and interaction patterns where appropriate, but do not visually restart onboarding. They use the normal profile top bar, explicit save/continue controls, predictable back navigation, and no nested page scroll.

## Identity And Search Settings

The user's own gender is not shown in the overview and is never represented by an icon. It appears only inside the full-screen `Кого искать` settings because it affects matching.

`Кого искать` shows:

- the currently stored own gender as text;
- the editable partner-gender preference;
- a secondary `Изменить мой пол` action.

Changing own gender is a protected self-service flow: the user chooses one of the currently supported values, sees that the change affects future search, and confirms before saving. It does not rewrite or close an existing connection. The implementation must preserve the current config-backed matching rules.

The display name remains non-editable in normal settings. A correction path exists only through Support. Deleting and recreating an account is not presented as the normal way to fix a typo.

## Support

The account group opens a dedicated Support screen instead of linking directly from the overview. It presents a short list of common reasons:

- Ошибка в имени или личных данных
- Не приходят уведомления
- Проблема со связью
- Безопасность или жалоба
- Другой вопрос

Each topic leads to the existing Telegram support contact with a clear topic. There is no correction button next to the display name.

## Accessibility And Responsive Rules

- Information cannot be conveyed by color or an unlabeled icon alone.
- Interactive rows and controls have at least a 44×44 px touch target.
- Focus indicators remain visible, semantic headings stay ordered, and icon-only controls have accessible labels.
- The complete overview must be usable at 390×844 without a nested scroll container. At 390×667, only the document may scroll.
- Long names, handles, bio text, option labels, and five Trust Keys must wrap or truncate without horizontal overflow.
- Existing Corens tokens, typography, radii, and calm visual language remain canonical. Do not introduce a new font, bright dashboard palette, decorative animation, or a second design system.

## Out Of Scope

- Public profile preview.
- Photo upload or photo-reveal redesign.
- New gender categories or pronouns; these require a separate product and matching-policy decision.
- Name self-service editing.
- Changes to active connection lifecycle, consent, Beacon, Telegram notifications, analytics, or deployment.

## Acceptance Criteria

- `/profile` shows a neutral identity header, real visibility status, concise bio preview, and the agreed three groups.
- No gender icon or gender text appears in the overview header.
- Every individual context row edits only its own value.
- The complete context flow saves intent, state, and Trust Keys as one validated update.
- Search preference and own gender are edited outside the context flow.
- Name correction is discoverable through Support, not beside the name.
- Focused tests, full tests, typecheck, build, mobile browser verification, and GitNexus change detection pass before completion.
