import { AppSurface } from "@corens/ui";

export default function Loading() {
  return (
    <AppSurface>
      <div className="corens-skeleton corens-skeleton-topbar" />
      <div className="corens-skeleton corens-skeleton-hero" />
      <div className="corens-skeleton corens-skeleton-label" style={{ marginTop: 8 }} />
      <div className="corens-skeleton corens-skeleton-card" />
    </AppSurface>
  );
}
