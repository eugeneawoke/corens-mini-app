import { Radio, TimerReset } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, Button, NoticeCard, Panel, Section, StatusBadge, TopBar } from "@corens/ui";

import { activateBeaconAction } from "../actions";
import { getBeaconSummary, getProfileSummary } from "../../lib/api";

export default async function BeaconPage() {
  const profile = await getProfileSummary();

  if (!profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  const snapshot = await getBeaconSummary();

  return (
    <AppSurface
      bottomBar={
        <form action={activateBeaconAction}>
          <Button variant="beacon">Активировать Beacon</Button>
        </form>
      }
    >
      <TopBar title="Beacon" backHref="/" />

      <Panel className="corens-stack corens-gap-sm" tone="beacon">
        <div className="corens-row corens-row-between">
          <div className="corens-inline-head">
            <Radio size={18} />
            <div className="corens-stack corens-gap-xs">
              <h2 className="corens-section-title">Ручной режим поиска</h2>
              <p className="corens-copy corens-copy-muted">
                {snapshot.description}
              </p>
            </div>
          </div>
          <StatusBadge tone="accent">{snapshot.durationLabel}</StatusBadge>
        </div>
      </Panel>

      <Section title="Что происходит при активации">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <p className="corens-copy corens-copy-muted">
              Профиль становится временно заметнее только в рамках Beacon policy. Это не замена основному matching pipeline.
            </p>
            <div className="corens-row">
              <StatusBadge tone="accent">Ручной режим</StatusBadge>
              <StatusBadge tone="neutral">Без чата</StatusBadge>
              <StatusBadge tone="neutral">Privacy-first</StatusBadge>
            </div>
          </div>
        </Panel>
      </Section>

      <NoticeCard
        icon={TimerReset}
        title="Cooldown и таймер"
        description="Таймер лучше показывать серверным значением. Пока здесь только дизайн-маркер для будущей интеграции с beacon API."
      />
    </AppSurface>
  );
}
