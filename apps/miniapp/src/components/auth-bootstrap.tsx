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
          <h1 className="corens-section-title">Входим...</h1>
        </Panel>

        <NoticeCard
          title={status === "bootstrapping" ? "Проверяем вашу сессию" : "Не получилось войти"}
          description={
            status === "bootstrapping"
              ? "Пожалуйста, подождите пару секунд."
              : "Откройте приложение через Telegram — иначе войти не получится."
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
