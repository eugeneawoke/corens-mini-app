import { AppSurface } from "@corens/ui";

export default function Loading() {
  return (
    <AppSurface>
      <div className="corens-loading-stage">
        <div className="corens-loading-orb" aria-hidden="true" />
        <div className="corens-loading-copy">
          <h2 className="corens-loading-title">Начинаем знакомство</h2>
          <p className="corens-loading-text">Подготовим ваш первый шаг</p>
        </div>
        <div className="corens-intro-transition-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="corens-skeleton corens-skeleton-hero" />
      <div className="corens-skeleton corens-skeleton-label" />
      <div className="corens-skeleton corens-skeleton-card" />
      <div className="corens-skeleton corens-skeleton-card" />
    </AppSurface>
  );
}
