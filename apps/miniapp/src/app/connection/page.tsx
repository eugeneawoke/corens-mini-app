import type { BeaconSummary } from "@corens/domain";
import { CircleUserRound, User, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  Button,
  ButtonLink,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { deactivateBeaconAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { BeaconHero } from "../../components/beacon-hero";
import { BeaconCountdown } from "../../components/beacon-countdown";
import {
  cleanupBotNotifications,
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

export default async function ConnectionPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
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
    redirect("/onboarding/intro");
  }

  if (from === "notification") {
    await cleanupBotNotifications();
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
  const CONNECTION_LIMIT = 8;
  const isAtLimit = activeConnections.length >= CONNECTION_LIMIT;

  return (
    <AppSurface>
      <TopBar
        title="Рядом"
        action={
          <a className="corens-icon-button" href="/profile" aria-label="Профиль">
            {profile.profile.gender === "female" ? <UserRound size={18} /> : <User size={18} />}
          </a>
        }
      />

      {activeConnections.length > 0 ? (
        <Section
          title="Ваши связи"
          description={
            isAtLimit
              ? `Все ${CONNECTION_LIMIT} места заняты. Новая связь появится когда закроется одна из текущих.`
              : undefined
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
        <div className="corens-empty-state">
          <span className="corens-eyebrow">Пока тихо</span>
          <p className="corens-copy corens-copy-muted">
            Поиск идёт по вашим ключам и состоянию. Связь появится, когда найдётся подходящий человек рядом.
          </p>
        </div>
      )}

      <Section title="Маяк">
        <div className="corens-beacon-hero-shell">
          <BeaconHero active={beacon.status === "active"} size={72} />
        </div>
        <Panel tone={beacon.status === "active" ? "beacon" : "muted"}>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-stack corens-gap-xs">
                <div className="corens-inline-head">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 21h14" />
                    <path d="M8 21v-2h8v2" />
                    <path d="M9 19l-1-8h8l-1 8" />
                    <path d="M8.6 14.5h6.8" />
                    <rect x="7" y="7" width="10" height="4" rx="0.5" />
                    <path d="M7.5 7 Q12 4 16.5 7" />
                    <path d="M4 9.5l3 0.5" opacity="0.5" />
                    <path d="M20 9.5l-3 0.5" opacity="0.5" />
                  </svg>
                  <h3 className="corens-card-title">
                    {beacon.status === "active" ? "Маяк светит" : "Маяк не горит"}
                  </h3>
                </div>
                <p className="corens-copy corens-copy-muted">
                  {beacon.status === "active"
                    ? "Вы чуть заметнее для тех, кто сейчас рядом."
                    : activeConnections.length === 0
                      ? "Зажгите маяк — люди с похожим состоянием рядом смогут вас заметить. Так проще найти первый контакт."
                      : "Хотите встретить ещё кого-то? Маяк сделает вас заметнее для тех, у кого похожее состояние и ключи доверия."}
                </p>
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
