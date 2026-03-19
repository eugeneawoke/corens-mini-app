import { Radio, TimerReset } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, Button, NoticeCard, Panel, Section, StatusBadge, TopBar } from "@corens/ui";

import { activateBeaconAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getBeaconSummary,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function BeaconPage() {
  let profile;
  let snapshot;

  try {
    profile = await getProfileSummary();
    snapshot = await getBeaconSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }

    throw error;
  }

  if (!profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface
      bottomBar={
        <form action={activateBeaconAction}>
          <Button variant="beacon">Зажечь маяк</Button>
        </form>
      }
    >
      <TopBar title="Маяк" backHref="/" />

      <Panel className="corens-stack corens-gap-sm" tone="beacon">
        <div className="corens-row corens-row-between">
          <div className="corens-inline-head">
            <Radio size={18} />
            <div className="corens-stack corens-gap-xs">
              <h2 className="corens-section-title">Побыть заметнее</h2>
              <p className="corens-copy corens-copy-muted">
                {snapshot.description}
              </p>
            </div>
          </div>
          <StatusBadge tone="accent">{snapshot.durationLabel}</StatusBadge>
        </div>
      </Panel>

      <Section title="Как это работает">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <p className="corens-copy corens-copy-muted">
              На короткое время вы становитесь чуть заметнее для тех, кто сейчас рядом. Поиск при этом продолжается как обычно.
            </p>
            <div className="corens-row">
              <StatusBadge tone="accent">По желанию</StatusBadge>
              <StatusBadge tone="neutral">Без лишнего</StatusBadge>
              <StatusBadge tone="neutral">Приватно</StatusBadge>
            </div>
          </div>
        </Panel>
      </Section>

      <NoticeCard
        icon={TimerReset}
        title="Пауза между включениями"
        description="После отключения маяка нужно немного подождать, прежде чем зажечь его снова."
      />
    </AppSurface>
  );
}
