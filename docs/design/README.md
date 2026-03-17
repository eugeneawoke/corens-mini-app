# Design Sources

These are the active design inputs for the current Mini App implementation:

- `corens-design/DESIGN_SYSTEM.md`: compact UI system for the current MVP
- `corens-design/UI_SCREENS_DESIGN.md`: screen-level product UI decisions for the current MVP
- `stitch 2/*/code.html`: reference layouts generated from the approved prompt set
- `stitch 2/*/screen.png`: visual snapshots for comparison while implementing

## Implementation Rule

The textual documents in `corens-design/` are the canonical product/design source for the current MVP.

The generated assets in `stitch 2/` are implementation references, not strict source-of-truth. If they conflict with:

- `DECISIONS.md`
- `docs/architecture/mvp-architecture.md`
- `API-CONTRACT.md`
- `DOMAIN.md`

then the governance and architecture documents win.

## Current Known Exclusions

The Stitch exports currently include patterns that should **not** be implemented for MVP:

- bottom tab navigation
- chat/messages UI
- search/discovery tabs outside Beacon
- notifications tabs
- extra product sections not present in the current route map

## Current Integration Path

- shared primitives live in `packages/ui`
- route composition lives in `apps/miniapp/src/app`
- Telegram session bootstrap lives in `apps/miniapp/src/components/auth-bootstrap.tsx` and `apps/miniapp/src/app/auth/bootstrap/route.ts`
- Mini App data loading now flows through the guarded backend API instead of a local demo/view-model layer

Screen implementations should preserve the approved design structure while binding to the current auth/session boundary and backend-backed route data.
