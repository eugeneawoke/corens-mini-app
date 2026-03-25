import type { BeaconSummary } from "@corens/domain";
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

import { blockConnectionAction, deactivateBeaconAction, reportConnectionAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { BeaconCountdown } from "../../components/beacon-countdown";
import {
  formatMiniAppBackendError,
  getBeaconSummary,
  getCurrentConnection,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

const FALLBACK_BEACON: BeaconSummary = {
  status: "inactive" as const,
  remainingLabel: "Недоступно",
  description: "Статус маяка временно недоступен. Попробуйте обновить экран позже.",
  durationLabel: "Недоступно"
};

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
  let profile;

  try {
    profile = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen details={formatMiniAppBackendError(error)} />;
    }

    throw error;
  }

  if (!profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  // Fetch connection and beacon in parallel — they don't depend on each other
  const [connectionResult, beaconResult] = await Promise.allSettled([
    getCurrentConnection(),
    getBeaconSummary()
  ]);

  if (connectionResult.status === "rejected") {
    const error = connectionResult.reason;
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }
    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen details={formatMiniAppBackendError(error)} />;
    }
    throw error;
  }

  const connection = connectionResult.value;
  const beacon = beaconResult.status === "fulfilled" ? beaconResult.value : FALLBACK_BEACON;

  if (!connection) {
    return (
      <AppSurface>
        <TopBar
          title="Рядом"
          action={
            <a className="corens-icon-button" href="/profile" aria-label="Профиль">
              <CircleUserRound size={18} />
            </a>
          }
        />

        <Panel className="corens-hero-card">
          <div className="corens-hero-copy">
            <span className="corens-eyebrow">Прямо сейчас</span>
            <h2 className="corens-hero-title">Мы ищем кого-то близкого вам</h2>
            <p className="corens-copy corens-copy-muted">
              Настроение: <strong>{profile.state.current.label}</strong> · Формат: <strong>{profile.intent.current.label}</strong>.
            </p>
          </div>
        </Panel>

        <EmptyState
          icon={Compass}
          title="Пока тихо"
          description="Поиск идёт в фоне сам по себе. Включите маяк — и вас смогут найти быстрее."
        />

        <Section title="Маяк">
          <Panel tone={beacon.status === "active" ? "beacon" : "muted"}>
            <div className="corens-stack corens-gap-sm">
              <div className="corens-row corens-row-between">
                <div className="corens-stack corens-gap-xs">
                  <div className="corens-inline-head">
                    <Radio size={18} />
                    <h3 className="corens-card-title">
                      {beacon.status === "active" ? "Маяк горит" : "Маяк не горит"}
                    </h3>
                  </div>
                  <p className="corens-copy corens-copy-muted">{beacon.description}</p>
                </div>
                {beacon.status === "active" ? (
                  <BeaconCountdown expiresAt={beacon.expiresAt} fallbackLabel={beacon.remainingLabel} />
                ) : (
                  <StatusBadge tone="neutral">Можно включить</StatusBadge>
                )}
              </div>
              {beacon.status === "active" ? (
                <form action={deactivateBeaconAction}>
                  <Button type="submit" variant="beacon">Потушить маяк</Button>
                </form>
              ) : (
                <ButtonLink href="/beacon" variant="beacon">Зажечь маяк</ButtonLink>
              )}
            </div>
          </Panel>
        </Section>
      </AppSurface>
    );
  }

  if (connection.kind === "peer_deleted") {
    return (
      <AppSurface
        bottomBar={
          <ButtonLink href="/beacon" variant="beacon">
            {connection.primaryActionLabel}
          </ButtonLink>
        }
      >
        <TopBar
          title="Ваша связь"
          action={
            <a className="corens-icon-button" href="/profile" aria-label="Профиль">
              <CircleUserRound size={18} />
            </a>
          }
        />

        <Panel className="corens-stack corens-gap-sm">
          <span className="corens-eyebrow">Системное сообщение</span>
          <h2 className="corens-section-title">{connection.title}</h2>
          <p className="corens-copy corens-copy-muted">{connection.description}</p>
        </Panel>

        <Section title="Что произошло">
          <Panel tone="warning">
            <div className="corens-stack corens-gap-sm">
              <div className="corens-inline-head">
                <Unlink2 size={18} />
                <strong className="corens-card-title">Связь закрыта</strong>
              </div>
              <p className="corens-copy corens-copy-muted">{connection.statusCopy}</p>
              <ButtonLink href="/beacon" variant="secondary">
                {connection.primaryActionLabel}
              </ButtonLink>
            </div>
          </Panel>
        </Section>
      </AppSurface>
    );
  }

  return (
    <AppSurface>
      <TopBar
        title="Ваша связь"
        action={
          <a className="corens-icon-button" href="/profile" aria-label="Профиль">
            <CircleUserRound size={18} />
          </a>
        }
      />

      <Panel className="corens-stack corens-gap-sm">
        <div className="corens-row corens-row-between">
          <div className="corens-stack corens-gap-xs">
            <span className="corens-eyebrow">О человеке рядом</span>
            <h2 className="corens-section-title">{connection.displayName}</h2>
            <p className="corens-copy corens-copy-muted">
              Фото и способ связаться откроются только если вы оба захотите.
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

      <Section title="Почему вы рядом">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div>
                <h3 className="corens-card-title">Общее между вами</h3>
                <p className="corens-copy corens-copy-muted">{connection.sharedState}</p>
              </div>
              <StatusBadge tone="success">Созвучность: {connection.matchScore}</StatusBadge>
            </div>
            <p className="corens-copy corens-copy-muted">{connection.statusCopy}</p>
          </div>
        </Panel>
      </Section>

      <Section title="Открыться навстречу">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-inline-head">
                <Shield size={18} />
                <div className="corens-stack corens-gap-xs">
                  <strong className="corens-card-title">Способ связаться</strong>
                  <span className="corens-list-description">
                    Ссылка для общения откроется только после взаимного согласия.
                  </span>
                </div>
              </div>
              <StatusBadge tone={toneForStatus(connection.contactConsent.status)}>
                {connection.contactConsent.status}
              </StatusBadge>
            </div>
            <ButtonLink href="/contact-consent" variant="secondary">
              Обменяться контактами
            </ButtonLink>
          </div>
        </Panel>

        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-inline-head">
                <Camera size={18} />
                <div className="corens-stack corens-gap-xs">
                  <strong className="corens-card-title">Фотография</strong>
                  <span className="corens-list-description">
                    Открыть фото можно отдельно — это самостоятельный шаг.
                  </span>
                </div>
              </div>
              <StatusBadge tone={toneForStatus(connection.photoConsent.status)}>
                {connection.photoConsent.status}
              </StatusBadge>
            </div>
            <ButtonLink href="/photo-reveal" variant="secondary">
              Показать фото
            </ButtonLink>
          </div>
        </Panel>
      </Section>

      <Section title="Если что-то пошло не так">
        <Panel tone="warning">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Unlink2 size={18} />
              <strong className="corens-card-title">Выйти из этой связи</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              После этого связь закроется, все открытые процессы остановятся.
            </p>
            <form action={reportConnectionAction} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Что случилось?"
                placeholder="Опишите кратко"
              />
              <Button type="submit" variant="secondary">Пожаловаться на этого человека</Button>
            </form>
            <form action={blockConnectionAction} className="corens-stack corens-gap-sm">
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
