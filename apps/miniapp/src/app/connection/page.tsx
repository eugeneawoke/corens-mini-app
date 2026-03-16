import { Camera, Lock, Shield, Unlink2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  ButtonLink,
  NoticeCard,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { getCurrentConnection, getProfileSummary } from "../../lib/api";

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

  if (!connection) {
    return (
      <AppSurface>
        <TopBar title="Связь" backHref="/" />
        <NoticeCard
          title="Активной связи нет"
          description="Когда backend найдет совместимую пару, экран связи заполнится данными о доверии и consent flow."
        />
      </AppSurface>
    );
  }

  return (
    <AppSurface>
      <TopBar title="Текущая связь" backHref="/" />

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

      <NoticeCard
        icon={Unlink2}
        title="Разрыв связи"
        description="Сейчас это только UI-маркер. Реальный skip / close flow должен прийти из matching API."
        tone="warning"
      />
    </AppSurface>
  );
}
