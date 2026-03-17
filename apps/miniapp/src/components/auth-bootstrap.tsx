"use client";

import { useEffect, useState } from "react";
import { Button, NoticeCard, Panel } from "@corens/ui";
import { bootstrapMiniAppSession } from "../lib/bootstrap-client";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

export function AuthBootstrapScreen() {
  const [status, setStatus] = useState<"bootstrapping" | "failed">("bootstrapping");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const initData = window.Telegram?.WebApp?.initData ?? "";

        window.Telegram?.WebApp?.ready?.();
        window.Telegram?.WebApp?.expand?.();

        if (!initData) {
          throw new Error("missing_init_data");
        }

        await bootstrapMiniAppSession(initData);

        if (!cancelled) {
          window.location.reload();
        }
      } catch {
        if (!cancelled) {
          setStatus("failed");
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="corens-sheet-layout">
      <div className="corens-sheet">
        <Panel className="corens-stack corens-gap-sm">
          <h1 className="corens-section-title">Подключаем защищенную сессию</h1>
          <p className="corens-copy corens-copy-muted">
            Mini App больше не использует demo fallback. Сессия создается только из валидного Telegram `initData`.
          </p>
        </Panel>

        <NoticeCard
          title={status === "bootstrapping" ? "Проверяем Telegram auth" : "Не удалось открыть сессию"}
          description={
            status === "bootstrapping"
              ? "Ждем валидный Telegram контекст и создаем backend session."
              : "Откройте Mini App из Telegram. В обычном браузере без `initData` этот экран не продолжит работу."
          }
          tone={status === "bootstrapping" ? "accent" : "danger"}
        />

        {status === "failed" ? (
          <Button type="button" onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        ) : null}
      </div>
    </div>
  );
}
