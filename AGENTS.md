# AGENTS.md

## Session Protocol

Before starting any non-trivial work in a new session:
1. Read `PLAN.md`, `TODO.md`, `DECISIONS.md`, `EVIDENCE.md`.
2. Read `~/.corens-mini-app/memory/MEMORY.md` and `~/.corens-mini-app/memory/project-state.md`.
3. Read `docs/product/conversation-validation-contract.md` for product, matching, onboarding, consent, or analytics work.
4. List the current sources of truth.
5. Check `docs/architecture/open-questions.md` for unresolved items.
6. Do not change architecture decisions without updating `DECISIONS.md`.
7. Do not add features outside the approved MVP scope.
8. Propose a plan before implementation.

## Repository Rules

- `PLAN.md` tracks phases and scope.
- `TODO.md` tracks the current active task.
- `DECISIONS.md` stores accepted product and architecture choices only.
- `EVIDENCE.md` stores verified facts only.
- `docs/adr/` stores ADRs and superseding decisions.
- `config/` stores versioned matrices and policy-backed rules.
- `docs/architecture/mvp-architecture.md` is the target system map.
- `docs/product/conversation-validation-contract.md` is the canonical validation product contract.
- `MASTER_PROMPT.md` defines the reusable one-task-per-session workflow.

## Guardrails

- Keep matching, consent, beacon, reveal, and privacy rules config-backed.
- Keep the zero-cost deployment baseline intact unless `DECISIONS.md` is updated.
- The active backend runtime is `apps/api`; do not reintroduce standalone bot or worker runtimes without an explicit decision.
- Preserve a single canonical document per concern to avoid drift.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **corens-mini-app** (1941 symbols, 4553 relationships, 157 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/corens-mini-app/context` | Codebase overview, check index freshness |
| `gitnexus://repo/corens-mini-app/clusters` | All functional areas |
| `gitnexus://repo/corens-mini-app/processes` | All execution flows |
| `gitnexus://repo/corens-mini-app/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
