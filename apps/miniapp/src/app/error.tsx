"use client";

import { useEffect } from "react";
import { BackendUnavailableScreen } from "../components/backend-unavailable";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function describeError(error: Error): {
  title: string;
  description: string;
  actionLabel: string;
} {
  const message = error.message;

  if (message.includes("/api/privacy/delete-request")) {
    if (message.includes("status 400")) {
      return {
        title: "Удаление не подтверждено",
        description: "Введите слово \"удалить\" точно в поле подтверждения и попробуйте снова.",
        actionLabel: "Вернуться и исправить"
      };
    }

    if (message.includes("status 401") || message.includes("status 403") || message.includes("session is required")) {
      return {
        title: "Сессия удаления истекла",
        description: "Откройте Mini App заново через Telegram и повторите удаление.",
        actionLabel: "Открыть заново"
      };
    }

    return {
      title: "Удаление не завершилось",
      description: "Сервер не смог завершить удаление аккаунта. Попробуйте ещё раз через пару секунд.",
      actionLabel: "Повторить удаление"
    };
  }

  if (message.includes("/api/privacy/dev-reset")) {
    if (message.includes("status 401") || message.includes("status 403") || message.includes("session is required")) {
      return {
        title: "Сессия сброса истекла",
        description: "Откройте Mini App заново через Telegram и повторите сброс.",
        actionLabel: "Открыть заново"
      };
    }

    return {
      title: "Сброс не завершился",
      description: "Не получилось очистить данные профиля и вернуть onboarding. Попробуйте ещё раз.",
      actionLabel: "Повторить сброс"
    };
  }

  return {
    title: "Экран не загрузился",
    description: "Что-то пошло не так. Попробуйте перезагрузить экран.",
    actionLabel: "Перезагрузить экран"
  };
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("Mini App route error", error);
  }, [error]);

  const content = describeError(error);

  return (
    <BackendUnavailableScreen
      title={content.title}
      actionLabel={content.actionLabel}
      onAction={reset}
      description={content.description}
    />
  );
}
