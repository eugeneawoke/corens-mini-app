# Final review fix report

Base: `657356f1e326e0306517ab4257da0677958d815d`

Worktree: `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/.worktrees/content-moderation-connection-ux`

## Scope completed

- Routed configured regex evaluation across bounded NFKC/lowercase base, confusable/leet-folded, delimiter-compacted, and whitespace-compacted inputs. The category loop remains `abusive -> contact -> advertising`.
- Added direct contact regressions for mixed-script/spaced Telegram links, bare domains, and separated/parenthesized phones while retaining safe dates, dotted version text, unknown-TLD dotted text, and unformatted ordinary numbers.
- Expanded the versioned MVP corpus with bounded Russian inflections, common transliterations/obfuscations, threats, a representative slur, explicit sexual language, English abuse, contact instructions, and commercial/recruiting calls to action. Matching remains token/phrase/boundary aware.
- Added a profile-content-only configuration validator for the required object shape, string maps/lists, and every configured regex. Invalid regex errors identify only the configuration path, never the expression.
- Dismissed the exact onboarding display-name action error state on the first edit, which also removes `aria-invalid`, `aria-describedby`, the rendered error, and the contextual Support link. A later server rejection is a new state and renders normally.
- Made the active-session database source order deterministic with `createdAt desc, id desc`; the existing tier-first stable ranking remains unchanged.

## GitNexus impact evidence

- `classifyProfileContent`: LOW, 2 direct dependents, 1 profile update process.
- `createContentViews` and `matchesRules`: LOW, 1 direct dependent each, 1 profile update process.
- `PolicyConfigService.loadProfileContentRules`: LOW, 1 direct getter, 1 profile update process. No existing shared loader was changed.
- `ProfileContentError`: LOW, 2 direct UI consumers, onboarding/profile page flows.
- `OnboardingFormActions`: LOW, 1 direct page consumer, onboarding flow.
- `MatchingRuntimeService.getConnections`: LOW, 2 direct dependents, no indexed execution process.

## RED evidence

Command:

`corepack pnpm exec vitest run tests/unit/profile-content-moderation.test.ts tests/unit/policy-config-loading.test.ts tests/unit/profile-content-error.test.ts tests/integration/connection-read-model.test.ts`

Result: exit 1; 4/4 files failed; 29 failed and 42 passed. Expected failures were:

- 23 classifier gaps: Russian inflections, transliterations/obfuscations, threat/slur/sexual/English abuse, all five required contact probes plus a contact phrase, and five commercial/recruiting phrases.
- 4 config-loader gaps: malformed rule-list shape resolved instead of rejecting, and invalid regexes in each of the three categories resolved instead of rejecting.
- 1 rendered-state gap: the dismissed rejected-name state still rendered its error and Support link.
- 1 query-contract gap: Prisma received only `{ createdAt: "desc" }` instead of the two-key order.

Additional compact-view RED command:

`corepack pnpm exec vitest run tests/unit/profile-content-moderation.test.ts`

Result: exit 1; 1 failed and 62 passed. The mixed-script, fully spaced `t . м e / name` probe returned `null` before the whitespace-compacted view was added.

## GREEN evidence

- Focused final: `corepack pnpm exec vitest run tests/unit/profile-content-moderation.test.ts tests/unit/policy-config-loading.test.ts tests/unit/profile-content-error.test.ts tests/integration/connection-read-model.test.ts` — 4 files, 73/73 passed.
- Full suite: `corepack pnpm test` — 41 files, 206/206 passed. Existing fixture WARN/DEBUG output remained unchanged.
- Typecheck: `corepack pnpm typecheck` — all 8 participating workspace projects passed.
- Build: `corepack pnpm build` — all workspace builds passed; Mini App compiled and generated 24/24 pages.
- Hygiene: `git diff --check` passed; targeted source search found no new console/logger flow or rejected/matched rule disclosure.

## Files in this fix commit

- `apps/api/src/modules/matching/runtime.service.ts`
- `apps/api/src/modules/profiles/content-moderation.ts`
- `apps/api/src/modules/profiles/profile-content-config.ts`
- `apps/api/src/policy-config.service.ts`
- `apps/miniapp/src/components/onboarding-form-actions.tsx`
- `apps/miniapp/src/components/profile-content-error.tsx`
- `config/moderation/profile-content.v1.json`
- `tests/integration/connection-read-model.test.ts`
- `tests/unit/policy-config-loading.test.ts`
- `tests/unit/profile-content-error.test.ts`
- `tests/unit/profile-content-moderation.test.ts`
- `.superpowers/sdd/2026-09-04-content-moderation-connection-ux/final-fix-report.md`

## Self-review

- Required direct probes classify as contact; safe date/dotted/ordinary-number cases remain accepted.
- Pattern work is bounded by a 1,024-code-unit classifier input and bounded phone repetitions; no unbounded profile-sized transformation was introduced.
- Loader validation runs before rules reach the classifier and reports only safe configuration paths.
- Classifier/runtime results remain category-only; no matched term, pattern, or rejected value is returned or logged.
- Onboarding error visibility, accessibility state, and Support-link rendering derive from the same dismissed action-state identity.
- Prisma tie-breaking is asserted literally; `rankConnectionSummaries` is untouched and therefore retains tier-first/source-order behavior.
- Existing dirty `AGENTS.md`, design-file newline, Playwright artifacts, and `output/` were neither edited nor staged by this pass.

## Concerns and rulings

- Compare-to-`main` GitNexus reports CRITICAL for the complete 48-file feature branch (`140` changed symbols, `47` affected), as expected for the already-reviewed cross-API/UI feature. Staged-only detection reports MEDIUM (`16` changed symbols, `3` affected profile-update flows across `12` changed files). Every existing symbol changed in this final pass had a LOW direct impact result; the new standalone validator has no prior indexed symbol.
- `notat.me/name` is now correctly contact content because `.me` is an allowlisted bare-domain TLD; `notat.meant/name` remains the non-domain boundary near-miss.
- The successful Next.js build retains the existing multiple-lockfile workspace-root warning; no lockfile or build configuration was changed here.
