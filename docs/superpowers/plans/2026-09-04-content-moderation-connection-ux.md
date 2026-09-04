# Content Moderation And Connection UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` with a fresh implementer and reviewer per task, followed by a whole-branch review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unacceptable names and bios from entering Corens, provide safe contextual recovery through Support, and prioritize actionable active conversations while restoring peer bio on detail.

**Architecture:** Add a pure profile-content classifier driven by versioned config and call it inside `ProfilesService` before any profile write. Preserve structured API errors through narrow server-action result types. Extend the active-connection contract with peer `about`, stably rank already-newest summaries by consent actionability, and render compact semantic card states.

**Tech Stack:** TypeScript, NestJS, Next.js 15, React 19, Prisma, Corens workspace packages, Lucide, Vitest, Playwright, GitNexus.

**Spec:** `docs/plans/2026-09-04-content-moderation-connection-ux-design.md`

## Global Constraints

- The API is authoritative; prohibited input must be rejected before profile persistence.
- Rules stay versioned and config-backed. Add no moderation table, third-party API, recurring scan, admin UI, dependency, font, or design system.
- Never log, persist, return, or put rejected text or a matched rule in a Support URL.
- Error precedence is abusive, contact, advertising. Return only the approved category and safe message.
- Add exactly two conditional `Задать вопрос поддержке` links: onboarding name and bio.
- Keep connection cards the same height. Mutual access remains highlighted and ranks first; incoming requests rank second.
- Show peer bio only on detail and only when non-empty.
- Preserve existing matching, consent, Beacon, privacy, notifications, visual tokens, and user-owned `.claude/settings.local.json` and `AGENTS.md` changes.
- Before editing every symbol, run GitNexus upstream impact analysis; warn before HIGH/CRITICAL edits.
- Before every commit run GitNexus `detect_changes({scope: "compare", base_ref: "main"})`.
- Follow red-green TDD for each task.

## Execution Model

- The controller owns the isolated worktree, plan-specific SDD ledger, impact checks, task ordering, review packages, rulings, verification, merge, and push.
- Run Tasks 1–4 sequentially with a fresh implementer and separate reviewer for every task. Never run two writing agents in the shared worktree.
- Record task commits, reviewer verdicts, fix rounds, and rulings under `.superpowers/sdd/`.

---

### Task 1: Add the config-backed classifier

**Files:**
- Create `config/moderation/profile-content.v1.json`
- Modify `packages/config/src/schemas.ts`, `packages/config/src/index.ts`, `apps/api/src/policy-config.service.ts`
- Create `apps/api/src/modules/profiles/content-moderation.ts`
- Create `tests/unit/profile-content-moderation.test.ts`; modify `tests/unit/policy-config-loading.test.ts`

**Produces:** `ProfileContentCategory`, typed `ProfileContentModerationConfig`, pure `classifyProfileContent(value, config)`, and memoized `PolicyConfigService.getProfileContentRules()`.

- [x] Impact-check `PolicyConfigService`, its moderation loader, and changed config exports.
- [x] Write failing tests for config loading/version; safe Russian/English names; profanity, insults, English abuse, transliteration, confusables, leetspeak, inserted spaces/punctuation; URLs, `t.me`, handles, email, phone, contact instructions; commercial calls to action; exceptions, substring safety, and category precedence.
- [x] Run `corepack pnpm exec vitest run tests/unit/profile-content-moderation.test.ts tests/unit/policy-config-loading.test.ts` and record the expected red result.
- [x] Implement NFKC/lowercase/zero-width cleanup, configured confusable and leet mappings, token and compact views, boundary-aware term/phrase checks, configured patterns, and explicit exceptions.
- [x] Run focused tests and `corepack pnpm typecheck`, run GitNexus change detection, then commit `feat: add profile content moderation rules`.

### Task 2: Enforce moderation and surface safe editor errors

**Files:**
- Modify `apps/api/src/modules/profiles/service.ts`
- Modify `apps/miniapp/src/app/actions.ts`, `apps/miniapp/src/app/onboarding/page.tsx`, `apps/miniapp/src/components/onboarding-form-actions.tsx`, `apps/miniapp/src/components/bio-field.tsx`, `apps/miniapp/src/app/globals.css`
- Create `apps/miniapp/src/lib/profile-content-errors.ts`
- Create `tests/integration/profile-content-enforcement.test.ts`, `tests/unit/profile-content-actions.test.ts`; modify onboarding structure tests

**Produces:** stable API error `{statusCode: 400, code: "profile_content_rejected", category, message}`, a serializable server-action result, and a generic `getProfileContentSupportHref()` that never contains rejected input.

- [x] Impact-check `ProfilesService.completeOnboarding`, `ProfilesService.updateAbout`, `sendApiMutation`, both actions, `OnboardingFormActions`, and `BioField`.
- [x] Write failing tests proving each category causes zero profile writes, safe input persists, arbitrary backend errors are not exposed, error copy stays field-local, and Support URLs contain neither rejected content nor matched terms.
- [x] Run the new integration/action/onboarding tests and record the expected red result.
- [x] Load and apply rules before `ensureProfileRecord`/`profile.update`; throw the stable structured `BadRequestException` with approved category copy.
- [x] Parse only the stable moderation body through server actions and keep controlled rejected input available for revision.
- [x] Render exactly two conditional, field-associated `Задать вопрос поддержке` links with `aria-describedby`, `aria-live`, 44 px target, visible focus, and generic encoded topic.
- [x] Run focused regressions and typecheck, run change detection, then commit `feat: enforce moderated profile content`.

### Task 3: Extend and rank the active connection read model

**Files:**
- Modify `packages/domain/src/lib/miniapp-api.ts`, `apps/api/src/modules/matching/runtime.service.ts`
- Create `tests/unit/connection-priority.test.ts`; modify matching runtime and API contract fixtures

**Produces:** `ActiveConnectionSummary.about: string | null`, a pure priority helper, and stable grouping mutual approved → inbound unanswered → ordinary → peer-deleted.

- [x] Impact-check `ActiveConnectionSummary`, `MatchingRuntimeService.getConnections`, and `buildActiveConnectionSummary`; inspect all consumers.
- [x] Write failing tests with deliberately interleaved newest-first fixtures. Assert grouping, stable order inside groups, peer-deleted last, filled peer bio propagation, and blank/missing bio normalization to `null`.
- [x] Run the focused unit/integration/contract tests and record the expected red result.
- [x] Add the contract field, select peer `about`, normalize blank to `null`, and stably sort using original list position as the secondary key.
- [x] Run focused tests and typecheck, run change detection, then commit `feat: prioritize actionable connections`.

### Task 4: Render compact states and peer bio

**Files:**
- Modify `apps/miniapp/src/app/connection/page.tsx`, `apps/miniapp/src/app/connection/[id]/page.tsx`, `apps/miniapp/src/app/globals.css`
- Create `apps/miniapp/src/lib/connection-view.ts`, `tests/unit/connection-view.test.ts`; modify focused structure/Playwright tests

**Produces:** `getConnectionCardState(connection): "ready" | "incoming" | "default"`, compact accessible icons/classes, and conditional detail-only bio.

- [x] Impact-check `ConnectionPage`, `ConnectionDetailPage`, and any extracted helper; verify CSS selector scope.
- [x] Write failing tests that ready wins, incoming matches only its canonical predicate, default is neutral, icons have hidden accessible labels, no visible `Ждёт вашего ответа` is added, and bio is detail-only/conditional.
- [x] Run focused tests and record the expected red result.
- [x] Add a restrained green ready state with open-lock icon and amber incoming state with response icon. Do not change card copy, density, height, or add animation.
- [x] Render a concise `О себе` section after identity only when `about?.trim()` is non-empty.
- [x] Verify at 390×844 and 390×667: no overflow, compact height, state distinction, accessible labels, conditional Support errors, and conditional bio.
- [x] Run focused tests and typecheck, run change detection, then commit `feat: clarify active connection states`.

## Final Verification And Delivery

- [x] Run a one-time read-only existing-profile check with the same classifier. Record aggregate counts/categories only in `EVIDENCE.md`; if credentials are unavailable, record it as unperformed rather than inventing evidence.
- [x] Search for rejected-text flow into logs, analytics, Support URLs, or new persistence paths.
- [x] Run `corepack pnpm test`, `corepack pnpm typecheck`, and `corepack pnpm build`.
- [x] Run focused Playwright and manual mobile verification at both approved viewports.
- [x] Run final GitNexus compare-to-main change detection and inspect affected symbols/processes.
- [x] Dispatch a most-capable whole-branch reviewer; resolve load-bearing findings and perform a scoped re-review.
- [x] Update plan checkboxes, `TODO.md`, `PLAN.md`, and `EVIDENCE.md` with verified outcomes; change-detect and commit the documentation.
- [x] Merge the feature branch to `main`, rerun full tests on merged `main`, and push `main` to `origin` without committing user-owned changes.
