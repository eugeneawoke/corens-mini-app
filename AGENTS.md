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

<!-- codebase-memory:start -->
# Code intelligence

This project is indexed by **codebase-memory-mcp** (persistent code knowledge graph). Before editing a function/class, use its graph tools (`search_graph`, `trace_path`, `detect_changes`) to find callers and blast radius. If the project is not indexed yet, ask to "index this project".
<!-- codebase-memory:end -->
