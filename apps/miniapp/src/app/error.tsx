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
      title="Не удалось открыть экран"
      actionLabel="Перезагрузить экран"
      onAction={reset}
      description={
        error.digest
          ? `Next.js перехватил серверную ошибку. Digest: ${error.digest}. Попробуйте перезагрузить экран.`
          : "Next.js перехватил серверную ошибку. Попробуйте перезагрузить экран."
      }
    />
  );
}
