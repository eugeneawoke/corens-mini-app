# Profile Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan with one fresh implementer and one task reviewer per task, followed by a whole-branch review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-onboarding profile wall with a compact, accurate overview and dedicated full-screen editors for context, search settings, identity correction, bio, privacy, and support.

**Architecture:** Keep `ProfileSummary` as the profile read model and the existing authenticated Mini App mutation boundary. Add two narrowly scoped profile mutations—an atomic context update and a protected own-gender update—then compose the overview from pure presentation helpers and focused routes. Reuse the existing Corens UI system and onboarding selectors; do not introduce a new design system or runtime.

**Tech Stack:** TypeScript, Next.js 15 App Router, React 19, NestJS, Prisma, `@corens/domain`, `@corens/ui`, Lucide, Vitest, Playwright, GitNexus.

**Spec:** `docs/plans/2026-09-02-profile-settings-redesign-design.md`

## Global Constraints

- Preserve intent, state, Trust Keys, automatic matching, Beacon, separate consent, privacy, and the Telegram handoff.
- Use a gender-neutral profile placeholder; do not encode gender by icon, silhouette, or color.
- Do not show or edit the user's own gender in the profile overview.
- Keep `Кого искать` outside the combined context editor.
- Keep name correction inside Support; do not add an edit or help control beside the name.
- A gender change affects future matching inputs only and must not close or rewrite an existing connection.
- Do not add dependencies, a new font, a new component library, external plugins, analytics events, or deployment work.
- Preserve user-owned changes in `.claude/settings.local.json` and `AGENTS.md`.
- Before editing every function, class, or method, run GitNexus upstream impact analysis and report the risk. Re-index first because the index was two commits behind when this plan was written.

## Agent-Driven Execution Model

- The controller owns the worktree, SDD ledger, task ordering, rulings, review packages, and final verification.
- Dispatch Tasks 1–6 sequentially. Each task receives a fresh implementer agent and must pass specification plus code-quality review before the next task begins.
- Never run two implementation agents concurrently in the same worktree. Tasks 1–4 overlap through API contracts, `apps/miniapp/src/app/actions.ts`, profile routes, shared selectors, and `globals.css`; parallel writes would create hidden integration conflicts.
- Parallel agents are allowed only for independent read-only work after a stable commit exists, such as accessibility inspection, sensitive-data review, or final diff review. They must not edit files.
- Track every completed task, commit, review verdict, fix round, and ruling in the plan-specific `.superpowers/sdd/.../progress.md` ledger so compaction cannot cause completed work to be repeated.

---

### Task 1: Add validated profile-editing contracts

**Files:**
- Modify: `packages/domain/src/lib/miniapp-api.ts`
- Modify: `apps/api/src/request-validation.ts`
- Modify: `apps/api/src/modules/profiles/service.ts`
- Modify: `apps/api/src/profile.controller.ts`
- Modify: `apps/miniapp/src/app/actions.ts`
- Create: `tests/unit/profile-request-validation.test.ts`
- Create: `tests/integration/profile-editing.test.ts`

**Interfaces:**
- Produces: `UpdateContextRequest { stateKey: string; intentKey: string; trustKeys: string[] }`.
- Produces: `UpdateGenderRequest { gender: "male" | "female" }`.
- Produces: authenticated `PATCH /api/profile/context` and `PATCH /api/profile/gender`.
- Produces: `updateFullContextAction(formData)` and `updateGenderAction(formData)`.

- [ ] **Step 1: Run GitNexus impact analysis before touching symbols**

Run upstream impact for `ProfileController`, `ProfilesService.updateStateIntent`, `ProfilesService.updateTrustKeys`, the relevant request parsers, and the Mini App actions. Stop and warn before any HIGH or CRITICAL edit.

- [ ] **Step 2: Write failing parser tests**

Add cases that accept only known-shaped bodies and reject an unknown gender, more than 16 Trust Keys, non-string values, and overlong keys. The tests must assert `BadRequestException`, not merely a thrown error.

- [ ] **Step 3: Write failing service tests**

Create an in-memory Prisma fixture and prove that one context update writes `stateKey`, trimmed `intentKey`, sanitized Trust Keys, and `trustKeysUpdatedAt` in one `profile.update`. Prove that an invalid state, intent, group limit, or gender performs no write. Prove that changing gender does not update any `matchSession` record.

- [ ] **Step 4: Run the focused tests and confirm the expected failures**

Run:

```bash
corepack pnpm exec vitest run tests/unit/profile-request-validation.test.ts tests/integration/profile-editing.test.ts
```

Expected: failures for missing request types, parsers, service methods, and controller routes.

- [ ] **Step 5: Implement the minimum domain, parser, service, and controller changes**

Validate with the existing `stateOptions`, `intentOptions`, `sanitizeTrustKeys`, and group limits. The context mutation must use one Prisma profile update. The gender mutation accepts only the schema's current `male` and `female` values. Keep the endpoints behind the existing `SessionAuthGuard`.

- [ ] **Step 6: Add Mini App actions**

`updateFullContextAction` posts all three fields, invalidates `profile`, `/profile`, `/context/edit`, `/connection`, and redirects to `/profile`. `updateGenderAction` posts a confirmed supported value, invalidates the same profile/search surfaces, and redirects to `/gender`.

- [ ] **Step 7: Run focused tests until green and commit the slice**

```bash
corepack pnpm exec vitest run tests/unit/profile-request-validation.test.ts tests/integration/profile-editing.test.ts
git add packages/domain/src/lib/miniapp-api.ts apps/api/src/request-validation.ts apps/api/src/modules/profiles/service.ts apps/api/src/profile.controller.ts apps/miniapp/src/app/actions.ts tests/unit/profile-request-validation.test.ts tests/integration/profile-editing.test.ts
git commit -m "feat: add protected profile editing contracts"
```

### Task 2: Build the compact, truthful profile overview

**Files:**
- Create: `apps/miniapp/src/lib/profile-view.ts`
- Modify: `apps/miniapp/src/app/profile/page.tsx`
- Modify: `apps/miniapp/src/app/globals.css`
- Create: `tests/unit/profile-view.test.ts`
- Create: `tests/unit/profile-structure.test.ts`
- Delete: `apps/miniapp/src/components/bio-field.tsx` after all imports are removed

**Interfaces:**
- Produces: `getProfileVisibilityView(summary)` returning `{ label, tone }` from `privacy.visibility`.
- Produces: `formatTrustKeySummary(selected, limit = 3)`.
- Produces: the routes and labels consumed by the overview rows.

- [ ] **Step 1: Impact-check `ProfilePage`, `StatusBadge`, and `ListRow`**

Do not modify shared UI primitives unless their current props cannot express the approved layout. Prefer page-local markup and CSS over broad changes in `@corens/ui`.

- [ ] **Step 2: Write failing pure helper tests**

Cover visible → `В поиске`, hidden → `Не в поиске`, zero/one/three/five Trust Keys, and long labels. The five-key case must produce the first three labels plus `+2` without losing the underlying accessible text.

- [ ] **Step 3: Write failing structure tests**

Assert that the profile source has a single neutral `UserRound` placeholder, contains no gender branch, does not import `BioField`, derives the badge from visibility, and includes the three headings `Ваш контекст`, `Настройки поиска`, and `Аккаунт`. Assert exact links for `/context/intent`, `/context/state`, `/trust-keys`, `/context/edit`, `/about`, `/gender`, `/privacy`, `/support`, and `/delete`.

- [ ] **Step 4: Run the focused tests and observe failure**

```bash
corepack pnpm exec vitest run tests/unit/profile-view.test.ts tests/unit/profile-structure.test.ts
```

- [ ] **Step 5: Implement the overview**

Use the agreed identity header, read-only bio preview, compact context rows, separate search rows, and account rows. Derive the badge from `snapshot.privacy.visibility.isHidden`. Do not show current connection, own gender, or an always-open textarea. Use selected Trust Key values as chips or concise text, with `+N` after the third.

- [ ] **Step 6: Add responsive and accessibility CSS**

Keep existing tokens. Ensure 44 px touch targets, visible focus, no horizontal overflow, wrapping for long identity text, and no nested scroll container. Add only `corens-profile-*` selectors needed by this screen.

- [ ] **Step 7: Run focused tests, typecheck, and commit**

```bash
corepack pnpm exec vitest run tests/unit/profile-view.test.ts tests/unit/profile-structure.test.ts
corepack pnpm typecheck
git add apps/miniapp/src/lib/profile-view.ts apps/miniapp/src/app/profile/page.tsx apps/miniapp/src/app/globals.css apps/miniapp/src/components/bio-field.tsx tests/unit/profile-view.test.ts tests/unit/profile-structure.test.ts
git commit -m "feat: redesign profile settings overview"
```

### Task 3: Add focused and complete context editors

**Files:**
- Create: `apps/miniapp/src/app/context/intent/page.tsx`
- Create: `apps/miniapp/src/app/context/state/page.tsx`
- Create: `apps/miniapp/src/app/context/edit/page.tsx`
- Create: `apps/miniapp/src/components/context-editor.tsx`
- Modify: `apps/miniapp/src/app/state-intent/page.tsx`
- Modify: `apps/miniapp/src/app/trust-keys/page.tsx`
- Modify: `apps/miniapp/src/components/onboarding-intent-selector.tsx`
- Modify: `apps/miniapp/src/components/onboarding-state-selector.tsx`
- Modify: `apps/miniapp/src/components/trust-keys-selector.tsx`
- Modify: `apps/miniapp/src/app/actions.ts`
- Create: `tests/unit/profile-context-structure.test.ts`

**Interfaces:**
- The shared selectors continue submitting `intentKey`, `stateKey`, and `trustKeys` with no onboarding-only copy baked into them.
- `ContextEditor` owns a three-step draft and submits once through `updateFullContextAction`.
- `/state-intent` redirects to `/context/edit` to preserve old internal links.

- [ ] **Step 1: Impact-check every selector and action before editing**

Include onboarding as an affected consumer. Refactoring must preserve onboarding names, required rules, current selections, and existing onboarding tests.

- [ ] **Step 2: Write failing structure and interaction tests**

Assert that individual routes render only their named field, that the complete editor orders intent → state → Trust Keys, that Back preserves draft state, and that only the final step submits. Assert `Кого искать` does not appear in the context editor.

- [ ] **Step 3: Run the focused tests and confirm failure**

```bash
corepack pnpm exec vitest run tests/unit/profile-context-structure.test.ts tests/unit/onboarding-structure.test.ts
```

- [ ] **Step 4: Generalize selectors without changing their visual language**

Rename only if necessary and use GitNexus `rename`, never search-and-replace. Accept optional legend/readout props so onboarding and settings can supply their own copy. Preserve semantic fieldsets, controlled inputs, and `aria-live` readouts.

- [ ] **Step 5: Implement individual routes**

The intent route carries the current state as a hidden value and calls the existing state-intent mutation; the state route carries the current intent. Trust Keys retains its existing route and gets only the normal full-screen settings framing. Successful saves return to `/profile`.

- [ ] **Step 6: Implement the complete editor**

Use one client component with three visible states, a progress label, Back/Continue controls, preserved draft values, and a final submit to the atomic context endpoint. Do not nest a scrolling panel inside the page.

- [ ] **Step 7: Run regressions and commit**

```bash
corepack pnpm exec vitest run tests/unit/profile-context-structure.test.ts tests/unit/onboarding-structure.test.ts
corepack pnpm typecheck
git add apps/miniapp/src/app/context apps/miniapp/src/app/state-intent/page.tsx apps/miniapp/src/app/trust-keys/page.tsx apps/miniapp/src/components/context-editor.tsx apps/miniapp/src/components/onboarding-intent-selector.tsx apps/miniapp/src/components/onboarding-state-selector.tsx apps/miniapp/src/components/trust-keys-selector.tsx apps/miniapp/src/app/actions.ts tests/unit/profile-context-structure.test.ts
git commit -m "feat: add full-screen context editors"
```

### Task 4: Move bio, search preference, and gender correction to full-screen flows

**Files:**
- Create: `apps/miniapp/src/app/about/page.tsx`
- Create: `apps/miniapp/src/components/about-editor.tsx`
- Modify: `apps/miniapp/src/app/gender/page.tsx`
- Create: `apps/miniapp/src/app/gender/edit/page.tsx`
- Create: `apps/miniapp/src/components/gender-editor.tsx`
- Modify: `apps/miniapp/src/app/actions.ts`
- Modify: `apps/miniapp/src/app/globals.css`
- Create: `tests/unit/profile-identity-structure.test.ts`

**Interfaces:**
- `/about` submits `about` explicitly and returns to `/profile`; blur never saves.
- `/gender` displays own gender as text and edits `partnerGender`.
- `/gender/edit` requires a visible confirmation before calling `updateGenderAction`.

- [ ] **Step 1: Impact-check the gender page and update actions**

Review matching-policy consumers of `profile.gender` and verify the planned write changes only future candidate evaluation.

- [ ] **Step 2: Write failing tests**

Assert that `/about` has a labeled 200-character editor with explicit Save, `/gender` has no gender icon, and `/gender/edit` contains matching-impact copy plus confirmation. Assert no own-gender control exists in `/profile` or `/context/edit`.

- [ ] **Step 3: Run tests and confirm failure**

```bash
corepack pnpm exec vitest run tests/unit/profile-identity-structure.test.ts
```

- [ ] **Step 4: Implement the bio editor**

Keep the API's 200-character limit visible in UI, handle pending state, and save only on explicit submit. Empty input remains a supported way to remove the bio.

- [ ] **Step 5: Implement search and gender screens**

Retitle `/gender` to `Кого искать`. Keep the current partner options. Show own gender as a secondary factual value and link to the protected editor. On the protected route, require the user to choose a supported value and confirm that future search changes; keep current connections untouched.

- [ ] **Step 6: Run focused tests and commit**

```bash
corepack pnpm exec vitest run tests/unit/profile-identity-structure.test.ts tests/integration/profile-editing.test.ts
corepack pnpm typecheck
git add apps/miniapp/src/app/about apps/miniapp/src/components/about-editor.tsx apps/miniapp/src/app/gender apps/miniapp/src/components/gender-editor.tsx apps/miniapp/src/app/actions.ts apps/miniapp/src/app/globals.css tests/unit/profile-identity-structure.test.ts
git commit -m "feat: add focused profile identity editors"
```

### Task 5: Add Support common requests and finish account grouping

**Files:**
- Create: `apps/miniapp/src/app/support/page.tsx`
- Modify: `apps/miniapp/src/app/profile/page.tsx`
- Create: `tests/unit/profile-support-structure.test.ts`

**Interfaces:**
- Produces a static Support route with five approved topics and the existing Telegram support destination.
- Keeps name correction discoverable only through `Ошибка в имени или личных данных`.

- [ ] **Step 1: Write a failing support structure test**

Assert all five approved topics, a labeled external Telegram destination, and the absence of an edit/help action beside the profile name.

- [ ] **Step 2: Run it and confirm failure**

```bash
corepack pnpm exec vitest run tests/unit/profile-support-structure.test.ts
```

- [ ] **Step 3: Implement the Support page**

Use compact rows or disclosure blocks. Each topic must explain the next step before opening Telegram. If a prefilled Telegram draft is used, URL-encode the topic and retain a readable visible label. Do not collect support free text inside Corens.

- [ ] **Step 4: Run focused tests and commit**

```bash
corepack pnpm exec vitest run tests/unit/profile-support-structure.test.ts tests/unit/profile-structure.test.ts
git add apps/miniapp/src/app/support/page.tsx apps/miniapp/src/app/profile/page.tsx tests/unit/profile-support-structure.test.ts
git commit -m "feat: add profile support topics"
```

### Task 6: Verify mobile UX, affected flows, and canonical documentation

**Files:**
- Modify: `DECISIONS.md` only if implementation changes an accepted rule from the spec
- Modify: `EVIDENCE.md` with local verification facts only
- Modify: `TODO.md` so exactly one next task remains
- Modify: `/Users/eugene.gusakov/.corens-mini-app/memory/project-state.md`

- [ ] **Step 1: Run all automated checks**

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Run mobile browser verification**

Use the `playwright` or `playwright-interactive` skill against an authenticated local test session. Verify `/profile`, every individual editor, the three-step editor, `/gender`, `/gender/edit`, `/about`, `/privacy`, `/support`, and `/delete` at 390×844 and 390×667. Check keyboard focus, Back behavior, save redirects, long content, no horizontal overflow, no nested scroll at 390×844, and document-only scroll at 390×667. Save screenshots as temporary verification artifacts, not product assets.

- [ ] **Step 3: Review sensitive-data and matching behavior**

Confirm that no analytics event or log gained gender, name, Telegram username, or support-topic data. Re-run matching-policy tests and verify the gender update does not mutate an active match.

- [ ] **Step 4: Run GitNexus change detection**

Run `detect_changes({scope: "compare", base_ref: "main"})` from the worktree. Compare affected processes with the impact reports and investigate every unexpected flow before completion.

- [ ] **Step 5: Update verified project state and make the final commit**

Record exact commands and outcomes in `EVIDENCE.md`; do not claim deployment. Leave the next active TODO as review/release, not an unrelated implementation task.

```bash
git add EVIDENCE.md TODO.md
git commit -m "docs: verify profile settings redesign"
```

Update `/Users/eugene.gusakov/.corens-mini-app/memory/project-state.md` separately; it is outside the repository and must never be passed to `git add`.

- [ ] **Step 6: Final review**

Use `superpowers:requesting-code-review`, reopen every changed file, inspect `git diff main...HEAD`, and confirm that user-owned pre-existing changes were neither staged nor altered. Do not push, open a PR, merge, or deploy without explicit authorization.
