import type { BeaconSummary } from "@corens/domain";
import { CircleUserRound, Compass, Radio } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  Button,
  ButtonLink,
  EmptyState,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { deactivateBeaconAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { BeaconCountdown } from "../../components/beacon-countdown";
import {
  getBeaconSummary,
  getConnections,
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

export default async function ConnectionPage() {
  let profile;

  try {
    profile = await getProfileSummary();
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

  const [connectionsResult, beaconResult] = await Promise.allSettled([
    getConnections(),
    getBeaconSummary()
  ]);

  if (connectionsResult.status === "rejected") {
    const error = connectionsResult.reason;
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }
    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }
    throw error;
  }

  const connections = connectionsResult.value;
  const beacon = beaconResult.status === "fulfilled" ? beaconResult.value : FALLBACK_BEACON;
  const activeConnections = connections.filter((c) => c.kind === "active");
  const CONNECTION_LIMIT = 5;
  const isAtLimit = activeConnections.length >= CONNECTION_LIMIT;

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

      {activeConnections.length > 0 ? (
        <Section
          title="Ваши связи"
          description={
            isAtLimit
              ? `Все ${CONNECTION_LIMIT} места заняты. Новая связь появится когда закроется одна из текущих.`
              : `${activeConnections.length} из ${CONNECTION_LIMIT}`
          }
        >
          <div className="corens-bento-grid">
            {activeConnections.map((connection, index) => {
              if (connection.kind !== "active") return null;
              return (
                <a
                  key={connection.id}
                  href={`/connection/${connection.id}`}
                  className="corens-connection-card"
                  style={{ animationDelay: `${index * 0.5}s` }}
                >
                  <div className="corens-connection-card-inner">
                    <div className="corens-connection-card-score">
                      <StatusBadge tone="success">{connection.matchScore}</StatusBadge>
                    </div>
                    <h3 className="corens-connection-card-name">{connection.displayName}</h3>
                    <p className="corens-connection-card-state">{connection.sharedState}</p>
                    <div className="corens-chip-row">
                      {connection.sharedKeys.slice(0, 3).map((key) => (
                        <StatusBadge key={key} tone="accent">
                          {key}
                        </StatusBadge>
                      ))}
                      {connection.sharedKeys.length > 3 && (
                        <StatusBadge tone="accent">+{connection.sharedKeys.length - 3}</StatusBadge>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </Section>
      ) : (
        <>
          <Panel className="corens-hero-card">
            <div className="corens-hero-copy">
              <span className="corens-eyebrow">Прямо сейчас</span>
              <h2 className="corens-hero-title">Мы ищем кого-то близкого вам</h2>
              <p className="corens-copy corens-copy-muted">
                Настроение: <strong>{profile.state.current.label}</strong> · Формат:{" "}
                <strong>{profile.intent.current.label}</strong>.
              </p>
            </div>
          </Panel>

          <EmptyState
            icon={Compass}
            title="Пока тихо"
            description="Поиск идёт в фоне сам по себе. Включите маяк — и вас смогут найти быстрее."
          />
        </>
      )}

      <Section title="Маяк">
        <Panel tone={beacon.status === "active" ? "beacon" : "muted"}>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-stack corens-gap-xs">
                <div className="corens-inline-head">
                  <Radio size={18} />
                  <h3 className="corens-card-title">
                    {beacon.status === "active" ? "Маяк светит" : "Маяк не горит"}
                  </h3>
                </div>
                <p className="corens-copy corens-copy-muted">{beacon.description}</p>
              </div>
              {beacon.status === "active" && (
                <BeaconCountdown expiresAt={beacon.expiresAt} fallbackLabel={beacon.remainingLabel} />
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
