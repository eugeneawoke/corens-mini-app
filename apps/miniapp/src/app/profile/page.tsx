import { BadgeInfo, HeartHandshake, KeyRound, Lock, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, ListRow, Panel, Section, StatusBadge, TopBar } from "@corens/ui";

import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function ProfilePage() {
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
      <TopBar title="Профиль" backHref="/connection" />

      <Panel className="corens-stack corens-gap-sm">
        <div className="corens-row corens-row-between">
          <div className="corens-stack corens-gap-xs">
            <span className="corens-eyebrow">Вы</span>
            <h2 className="corens-section-title">{snapshot.profile.displayName}</h2>
            <p className="corens-copy corens-copy-muted">{snapshot.profile.handle}</p>
          </div>
          <StatusBadge tone="success">В поиске</StatusBadge>
        </div>
      </Panel>

      <Section title="О вас">
        <Panel>
          <ListRow
            href="/state-intent"
            title="Настроение и формат"
            description={`${snapshot.state.current.label} • ${snapshot.intent.current.label}`}
            icon={HeartHandshake}
          />
          <ListRow
            href="/trust-keys"
            title="Ключи доверия"
            description={snapshot.trustKeys.limitLabel}
            icon={KeyRound}
          />
          <ListRow
            href="/privacy"
            title="Приватность"
            description="Что и кому видно"
            icon={Lock}
          />
        </Panel>
      </Section>

      <Section title="Дополнительно">
        <Panel>
          <ListRow
            href="/connection"
            title="Текущая связь"
            description="Кто сейчас рядом с вами"
            icon={BadgeInfo}
          />
          <ListRow
            href="/delete"
            title="Удалить аккаунт"
            description="Безвозвратное действие"
            icon={Trash2}
          />
        </Panel>
      </Section>
    </AppSurface>
  );
}
