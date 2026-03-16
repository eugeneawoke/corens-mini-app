import { Camera, CircleUserRound, Compass, Lock, Radio, Shield, Unlink2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  EmptyState,
  Button,
  ButtonLink,
  Field,
  NoticeCard,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { blockConnectionAction, reportConnectionAction } from "../actions";
import { getBeaconSummary, getCurrentConnection, getProfileSummary } from "../../lib/api";

function toneForStatus(status: "pending" | "approved" | "declined") {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "declined") {
    return "danger" as const;
  }

  return "warning" as const;
}

export default async function ConnectionPage() {
  const profile = await getProfileSummary();

  if (!profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  const connection = await getCurrentConnection();
  const beacon = await getBeaconSummary();

  if (!connection) {
    return (
      <AppSurface
        bottomBar={
          <ButtonLink href="/beacon" variant="beacon">
            {beacon.status === "active" ? "Beacon уже активен" : "Включить Beacon"}
          </ButtonLink>
        }
      >
        <TopBar
          title="Связи"
          subtitle="Главный экран"
          action={
            <a className="corens-icon-button" href="/profile" aria-label="Профиль">
              <CircleUserRound size={18} />
            </a>
          }
        />

        <Panel className="corens-hero-card">
          <div className="corens-hero-copy">
            <span className="corens-eyebrow">Ваш контекст</span>
            <h2 className="corens-hero-title">Сейчас система ждёт подходящее совпадение</h2>
            <p className="corens-copy corens-copy-muted">
              State <strong>{profile.state.current.label}</strong>, intent <strong>{profile.intent.current.label}</strong>.
            </p>
          </div>
        </Panel>

        <EmptyState
          icon={Compass}
          title="Активной связи пока нет"
          description="Алгоритм матрицы совпадений проверяет совместимые пары автоматически. Beacon можно включить как ручной fallback по тем же параметрам."
          action={
            <div className="corens-action-stack">
              <ButtonLink href="/beacon" variant="secondary">
                Открыть Beacon
              </ButtonLink>
              <ButtonLink href="/profile" variant="ghost">
                Открыть профиль
              </ButtonLink>
            </div>
          }
        />

        <Section title="Статус Beacon">
          <Panel tone={beacon.status === "active" ? "beacon" : "muted"}>
            <div className="corens-row corens-row-between">
              <div className="corens-stack corens-gap-xs">
                <div className="corens-inline-head">
                  <Radio size={18} />
                  <h3 className="corens-card-title">
                    {beacon.status === "active" ? "Beacon активен" : "Beacon выключен"}
                  </h3>
                </div>
                <p className="corens-copy corens-copy-muted">{beacon.description}</p>
              </div>
              <StatusBadge tone={beacon.status === "active" ? "accent" : "neutral"}>
                {beacon.status === "active" ? beacon.remainingLabel : "Готов"}
              </StatusBadge>
            </div>
          </Panel>
        </Section>
      </AppSurface>
    );
  }

  return (
    <AppSurface>
      <TopBar
        title="Текущая связь"
        action={
          <a className="corens-icon-button" href="/profile" aria-label="Профиль">
            <CircleUserRound size={18} />
          </a>
        }
      />

      <Panel className="corens-stack corens-gap-sm">
        <div className="corens-row corens-row-between">
          <div className="corens-stack corens-gap-xs">
            <span className="corens-eyebrow">Preview профиля</span>
            <h2 className="corens-section-title">{connection.displayName}</h2>
            <p className="corens-copy corens-copy-muted">
              Фото и прямой контакт остаются закрыты до отдельного mutual consent.
            </p>
          </div>
          <div className="corens-status-lock">
            <Lock size={30} />
          </div>
        </div>
        <div className="corens-chip-row">
          {connection.sharedKeys.map((key) => (
            <StatusBadge key={key} tone="accent">
              {key}
            </StatusBadge>
          ))}
        </div>
      </Panel>

      <Section
        title="Контекст совпадения"
        description="Эти блоки получают статус через те же shared domain policy, что и backend."
      >
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div>
                <h3 className="corens-card-title">Ритм связи</h3>
                <p className="corens-copy corens-copy-muted">{connection.sharedState}</p>
              </div>
              <StatusBadge tone="success">Score {connection.matchScore}</StatusBadge>
            </div>
            <p className="corens-copy corens-copy-muted">{connection.statusCopy}</p>
          </div>
        </Panel>
      </Section>

      <Section title="Действия доверия">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-inline-head">
                <Shield size={18} />
                <div className="corens-stack corens-gap-xs">
                  <strong className="corens-card-title">Контакты</strong>
                  <span className="corens-list-description">
                    После одобрения откроется только Telegram deep link.
                  </span>
                </div>
              </div>
              <StatusBadge tone={toneForStatus(connection.contactConsent.status)}>
                {connection.contactConsent.status}
              </StatusBadge>
            </div>
            <ButtonLink href="/contact-consent" variant="secondary">
              Открыть Contact Consent
            </ButtonLink>
          </div>
        </Panel>

        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-inline-head">
                <Camera size={18} />
                <div className="corens-stack corens-gap-xs">
                  <strong className="corens-card-title">Фото</strong>
                  <span className="corens-list-description">
                    Photo reveal живет отдельно от consent на контакты.
                  </span>
                </div>
              </div>
              <StatusBadge tone={toneForStatus(connection.photoConsent.status)}>
                {connection.photoConsent.status}
              </StatusBadge>
            </div>
            <ButtonLink href="/photo-reveal" variant="secondary">
              Открыть Photo Reveal
            </ButtonLink>
          </div>
        </Panel>
      </Section>

      <Section title="Безопасность">
        <Panel tone="warning">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Unlink2 size={18} />
              <strong className="corens-card-title">Разорвать или пожаловаться</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              Жалоба и блокировка сразу закрывают активную связь и останавливают открытые consent flow.
            </p>
            <form action={reportConnectionAction} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Комментарий к жалобе"
                placeholder="Коротко опишите причину"
              />
              <Button type="submit" variant="secondary">Пожаловаться</Button>
            </form>
            <form action={blockConnectionAction} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Причина блокировки"
                placeholder="Коротко опишите причину"
              />
              <Button type="submit" variant="danger">Заблокировать и закрыть связь</Button>
            </form>
          </div>
        </Panel>
      </Section>
    </AppSurface>
  );
}
