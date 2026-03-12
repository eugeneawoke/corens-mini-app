# AGENTS.md

## Session Protocol

Before starting any non-trivial work in a new session:
1. Read `PLAN.md`, `TODO.md`, `DECISIONS.md`, `EVIDENCE.md`.
2. Read `~/.corens-mini-app/memory/MEMORY.md` and `~/.corens-mini-app/memory/project-state.md`.
3. List the current sources of truth.
4. Check `docs/architecture/open-questions.md` for unresolved items.
5. Do not change architecture decisions without updating `DECISIONS.md`.
6. Do not add features outside the approved MVP scope.
7. Propose a plan before implementation.

## Repository Rules

- `PLAN.md` tracks phases and scope.
- `TODO.md` tracks the current active task.
- `DECISIONS.md` stores accepted product and architecture choices only.
- `EVIDENCE.md` stores verified facts only.
- `docs/adr/` stores ADRs and superseding decisions.
- `config/` stores versioned matrices and policy-backed rules.
- `docs/architecture/mvp-architecture.md` is the target system map.

## Guardrails

- Keep matching, consent, beacon, reveal, and privacy rules config-backed.
- Keep the zero-cost deployment baseline intact unless `DECISIONS.md` is updated.
- The active backend runtime is `apps/api`; do not reintroduce standalone bot or worker runtimes without an explicit decision.
- Preserve a single canonical document per concern to avoid drift.
