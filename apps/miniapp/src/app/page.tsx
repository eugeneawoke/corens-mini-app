import { CircleUserRound, Compass, Radio, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  ButtonLink,
  EmptyState,
  Metric,
  NoticeCard,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { getHomeSummary } from "../lib/api";

export default async function HomePage() {
  const snapshot = await getHomeSummary();

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface
      bottomBar={
        <ButtonLink href="/beacon" variant="beacon">
          {snapshot.beacon.status === "active" ? "Beacon уже активен" : "Активировать Beacon"}
        </ButtonLink>
      }
    >
      <TopBar
        title="corens"
        subtitle="Mini App MVP"
        action={
          <a className="corens-icon-button" href="/profile" aria-label="Профиль">
            <CircleUserRound size={18} />
          </a>
        }
      />

      <Panel className="corens-hero-card">
        <div className="corens-hero-copy">
          <span className="corens-eyebrow">Текущее пространство</span>
          <h2 className="corens-hero-title">Спокойный, приватный контур знакомства</h2>
          <p className="corens-copy corens-copy-muted">
            Сейчас у вас активен state <strong>{snapshot.state.label}</strong> и
            намерение <strong>{snapshot.intent.label}</strong>.
          </p>
        </div>
        <div className="corens-hero-orbit">
          <div className="corens-cloud" />
          <div className="corens-crystal">
            <Sparkles size={18} />
          </div>
        </div>
      </Panel>

      <Section
        title="Текущая связь"
        description="Home показывает только краткий статус и ведет в детальный экран связи."
      >
        {snapshot.connection ? (
          <Panel>
            <div className="corens-stack corens-gap-sm">
              <div className="corens-row corens-row-between">
                <div>
                  <h3 className="corens-card-title">{snapshot.connection.displayName}</h3>
                  <p className="corens-copy corens-copy-muted">
                    Совпадение подтверждено backend matching policy
                  </p>
                </div>
                <StatusBadge tone="success">Связь активна</StatusBadge>
              </div>
              <div className="corens-metrics">
                <Metric label="Счет мэтча" value={snapshot.connection.matchScore} />
                <Metric label="Общие ключи" value={snapshot.connection.sharedKeys.length} />
                <Metric label="Доверие" value={`${snapshot.connection.trustLevel}/5`} />
              </div>
              <div className="corens-chip-row">
                {snapshot.connection.sharedKeys.map((key) => (
                  <StatusBadge key={key} tone="accent">
                    {key}
                  </StatusBadge>
                ))}
              </div>
              <ButtonLink href="/connection" variant="secondary">
                Открыть экран связи
              </ButtonLink>
            </div>
          </Panel>
        ) : (
          <EmptyState
            icon={Compass}
            title="Пока тихо"
            description="Когда backend найдет совместимую связь, здесь появится карточка с основным статусом и точкой входа в consent flow."
            action={
              <div className="corens-inline-action">
                <ButtonLink href="/beacon" variant="secondary">
                  Включить Beacon
                </ButtonLink>
              </div>
            }
          />
        )}
      </Section>

      <Section title="Статус Beacon">
        <Panel tone={snapshot.beacon.status === "active" ? "beacon" : "muted"}>
          <div className="corens-row corens-row-between">
            <div className="corens-stack corens-gap-xs">
              <div className="corens-inline-head">
                <Radio size={18} />
                <h3 className="corens-card-title">
                  {snapshot.beacon.status === "active" ? "Beacon активен" : "Beacon выключен"}
                </h3>
              </div>
              <p className="corens-copy corens-copy-muted">{snapshot.beacon.description}</p>
            </div>
            <StatusBadge
              tone={snapshot.beacon.status === "active" ? "accent" : "neutral"}
            >
              {snapshot.beacon.status === "active" ? snapshot.beacon.remainingLabel : "Готов"}
            </StatusBadge>
          </div>
        </Panel>
      </Section>

      <NoticeCard
        icon={CircleUserRound}
        title="Профиль и настройки"
        description="Редактирование state, trust keys, privacy и удаление аккаунта вынесены в отдельные экраны, без нижней tab-навигации."
      />
    </AppSurface>
  );
}
