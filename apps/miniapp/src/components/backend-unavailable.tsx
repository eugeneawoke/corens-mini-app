"use client";

import { Button, NoticeCard, Panel } from "@corens/ui";

type BackendUnavailableScreenProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function BackendUnavailableScreen({
  title = "Что-то пошло не так",
  description = "Мы уже знаем об этом. Попробуйте вернуться через несколько секунд.",
  actionLabel = "Попробовать снова",
  onAction
}: BackendUnavailableScreenProps) {
  return (
    <div className="corens-sheet-layout">
      <div className="corens-sheet">
        <Panel className="corens-stack corens-gap-sm">
          <h1 className="corens-section-title">{title}</h1>
          <p className="corens-copy corens-copy-muted">
            Попробуйте вернуться через несколько секунд.
          </p>
        </Panel>

        <NoticeCard title="Нет соединения с сервером" description={description} tone="danger" />

        <Button type="button" onClick={onAction ?? (() => window.location.reload())}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
