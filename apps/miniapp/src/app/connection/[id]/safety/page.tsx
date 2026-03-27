import { Shield, Unlink2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppSurface, Button, Field, Panel, Section, TopBar } from "@corens/ui";

import { blockConnectionAction, reportConnectionAction } from "../../../actions";
import { AuthBootstrapScreen } from "../../../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../../../components/backend-unavailable";
import {
  getConnectionById,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../../../lib/api";

export default async function ConnectionSafetyPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let profile;

  try {
    profile = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) return <AuthBootstrapScreen />;
    if (error instanceof MiniAppBackendUnavailableError) return <BackendUnavailableScreen />;
    throw error;
  }

  if (!profile.onboardingCompleted) {
    redirect("/onboarding/intro");
  }

  let connection;

  try {
    connection = await getConnectionById(id);
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) return <AuthBootstrapScreen />;
    if (error instanceof MiniAppBackendUnavailableError) return <BackendUnavailableScreen />;
    throw error;
  }

  if (!connection || connection.kind !== "active") {
    notFound();
  }

  return (
    <AppSurface>
      <TopBar title="Безопасность" backHref={`/connection/${id}`} />

      <Section title="Нужна помощь?">
        <Panel tone="warning">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Shield size={18} />
              <strong className="corens-card-title">Пожаловаться</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              Если что-то было неуместно или неприятно, можно отправить жалобу. Связь после этого закроется.
            </p>
            <form action={reportConnectionAction.bind(null, id)} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Что случилось?"
                placeholder="Опишите кратко"
              />
              <Button type="submit" variant="secondary">Пожаловаться на этого человека</Button>
            </form>
          </div>
        </Panel>
      </Section>

      <Section title="Если нужно жёстко остановить контакт">
        <Panel tone="danger">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Unlink2 size={18} />
              <strong className="corens-card-title">Заблокировать</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              Используйте блокировку, если не хотите больше пересекаться с этим человеком в будущем.
            </p>
            <form action={blockConnectionAction.bind(null, id)} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Почему вы хотите заблокировать?"
                placeholder="Опишите кратко"
              />
              <Button type="submit" variant="danger">Заблокировать</Button>
            </form>
          </div>
        </Panel>
      </Section>
    </AppSurface>
  );
}
