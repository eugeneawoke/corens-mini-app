"use client";

import { useEffect } from "react";
import { BackendUnavailableScreen } from "../components/backend-unavailable";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("Mini App route error", error);
  }, [error]);

  return (
    <BackendUnavailableScreen
      title="Экран не загрузился"
      actionLabel="Перезагрузить экран"
      onAction={reset}
      description="Что-то пошло не так. Попробуйте перезагрузить экран."
    />
  );
}
