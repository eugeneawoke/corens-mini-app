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
        description="Все ваши данные, связи и настройки будут удалены без возможности восстановления."
        tone="danger"
      />

      <Section title="Что произойдёт">
        <Panel>
          <ol className="corens-delete-steps">
            {snapshot.privacy.deletionPlan.stages.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
        </Panel>
      </Section>

      <form action={requestDeletionAction} className="corens-stack corens-gap-sm">
        <Section title="Подтверждение">
          <Field
            name="confirmation"
            label='Введите "удалить"'
            placeholder="удалить"
            hint="После подтверждения профиль исчезнет, все связи закроются, данные будут удалены."
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
