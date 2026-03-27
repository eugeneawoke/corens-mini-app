import { ShieldAlert, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  ButtonLink,
  NoticeCard,
  Panel,
  Section,
  TopBar
} from "@corens/ui";

import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { VisibilityToggle } from "../../components/privacy-toggle";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function PrivacyPage() {
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
    redirect("/onboarding/intro");
  }

  return (
    <AppSurface>
      <TopBar title="Приватность" backHref="/profile" />

      <Section
        title="Кто вас видит"
        description="Вы можете временно исчезнуть из поиска — уже найденные связи при этом не закроются."
      >
        <Panel>
          <div className="corens-stack corens-gap-sm">
            {snapshot.privacy.switches.map((item) => (
              <VisibilityToggle
                key={item.title}
                title={item.title}
                description={item.description}
                isHidden={item.checked}
              />
            ))}
          </div>
        </Panel>
      </Section>

      <NoticeCard
        icon={ShieldAlert}
        title="Как это работает"
        description={snapshot.privacy.privacyCopy}
      />

      <Section title="Уйти из сервиса">
        <Panel tone="danger">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Trash2 size={18} />
              <strong className="corens-card-title">Удаление аккаунта</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              Перед удалением мы покажем, что именно исчезнет навсегда и что увидит второй человек.
            </p>
            <ButtonLink href="/delete" variant="ghost">
              Удалить аккаунт
            </ButtonLink>
          </div>
        </Panel>
      </Section>
    </AppSurface>
  );
}
