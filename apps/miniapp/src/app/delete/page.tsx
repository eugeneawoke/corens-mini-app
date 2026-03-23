import { AlertTriangle } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  Button,
  Field,
  NoticeCard,
  Panel,
  Section,
  TopBar
} from "@corens/ui";

import { requestDeletionAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function DeletePage() {
  let snapshot;

  try {
    snapshot = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }

    throw error;
  }

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface>
      <TopBar title="Удаление аккаунта" backHref="/privacy" />

      <NoticeCard
        icon={AlertTriangle}
        title="Это действие необратимо"
        description="Все ваши данные будут удалены навсегда, а открытые связи закроются для второй стороны с системным уведомлением."
        tone="danger"
      />

      <Section title="Что произойдёт">
        <Panel>
          <p className="corens-copy corens-copy-muted">
            Мы завершим все активные сессии и закроем открытые договорённости с другим человеком.
            Ваши фото и данные профиля будут удалены навсегда. Если у вас была активная связь —
            второй человек получит системное уведомление о её закрытии. Отменить это действие невозможно.
          </p>
        </Panel>
      </Section>

      <form action={requestDeletionAction} className="corens-stack corens-gap-sm">
        <Section title="Подтверждение">
          <Field
            name="confirmation"
            label='Введите "удалить"'
            placeholder="удалить"
            hint="После подтверждения аккаунт будет удалён полностью, а следующий вход начнётся с чистого onboarding."
          />
        </Section>

        <div className="corens-action-stack">
          <Button type="submit" variant="danger">
            Удалить навсегда
          </Button>
        </div>
      </form>
    </AppSurface>
  );
}
