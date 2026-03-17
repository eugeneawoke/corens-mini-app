"use client";

import { Button, NoticeCard, Panel } from "@corens/ui";

type BackendUnavailableScreenProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function BackendUnavailableScreen({
  title = "Сервис временно недоступен",
  description = "Mini App открылся, но backend сейчас не ответил корректно. Попробуйте перезагрузить экран через несколько секунд.",
  actionLabel = "Попробовать снова",
  onAction
}: BackendUnavailableScreenProps) {
  return (
    <div className="corens-sheet-layout">
      <div className="corens-sheet">
        <Panel className="corens-stack corens-gap-sm">
          <h1 className="corens-section-title">{title}</h1>
          <p className="corens-copy corens-copy-muted">
            Если ошибка повторяется, проверьте свежие логи Vercel и Railway для текущего deploy.
          </p>
        </Panel>

        <NoticeCard title="Backend не ответил" description={description} tone="danger" />

        <Button type="button" onClick={onAction ?? (() => window.location.reload())}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
