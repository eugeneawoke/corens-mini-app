import { Radio, TimerReset } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, Panel, Section, TopBar } from "@corens/ui";
import { BeaconButton } from "../../components/beacon-button";

import { activateBeaconAction, deactivateBeaconAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { BeaconHero } from "../../components/beacon-hero";
import { BeaconCountdown } from "../../components/beacon-countdown";
import {
  getBeaconSummary,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function BeaconPage() {
  // Fetch profile and beacon status in parallel
  const [profileResult, snapshotResult] = await Promise.allSettled([
    getProfileSummary(),
    getBeaconSummary()
  ]);

  if (profileResult.status === "rejected" || snapshotResult.status === "rejected") {
    const failed = (profileResult.status === "rejected" ? profileResult : snapshotResult) as PromiseRejectedResult;
    const error = failed.reason;
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }
    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }
    throw error;
  }

  const profile = profileResult.value;
  const snapshot = snapshotResult.value;

  if (!profile.onboardingCompleted) {
    redirect("/onboarding/intro");
  }

  const isActive = snapshot.status === "active";

  return (
    <AppSurface>
      <TopBar title="Маяк" backHref="/connection" />

      <Panel
        className="corens-stack corens-gap-sm"
        tone="beacon"
        style={isActive ? { boxShadow: "0 8px 32px rgba(155, 107, 196, 0.35)" } : undefined}
      >
        <BeaconHero active={isActive} />
        <div className="corens-stack corens-gap-xs">
          <div className="corens-inline-head">
            <Radio size={18} />
            <h2 className="corens-section-title">{isActive ? "Маяк горит" : "Побыть заметнее"}</h2>
          </div>
          <p className="corens-copy corens-copy-muted">{snapshot.description}</p>
        </div>

        {isActive ? (
          <div className="corens-stack corens-gap-sm">
            <BeaconCountdown targetAt={snapshot.expiresAt} fallbackLabel={snapshot.remainingLabel} emphasized />
            <form action={deactivateBeaconAction}>
              <BeaconButton kind="deactivate" />
            </form>
          </div>
        ) : (
          <form action={activateBeaconAction} className="corens-stack corens-gap-sm">
            <div className="corens-field-wrap">
              <label className="corens-field-label" htmlFor="beacon-duration">
                Время маяка
              </label>
              <select id="beacon-duration" name="durationMinutes" className="corens-field">
                <option value="15">15 минут</option>
                <option value="30">30 минут</option>
                <option value="45">45 минут</option>
                <option value="60">1 час</option>
              </select>
            </div>
            <BeaconButton kind="activate" />
          </form>
        )}
      </Panel>

      <Section title="Как это работает">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <p className="corens-copy corens-copy-muted">
              На короткое время вы становитесь чуть заметнее для тех, кто сейчас рядом. Это мягкий способ
              дать поиску больше шансов, когда хочется не ждать слишком долго.
            </p>
            <p className="corens-copy corens-copy-muted">
              Маяк ничего не навязывает и не открывает лишнего. Он просто бережно помогает тем, кто вам подходит,
              заметить вас немного раньше.
            </p>
          </div>
        </Panel>
      </Section>

      <Panel
        tone={snapshot.status === "cooldown" ? "warning" : "muted"}
        className={snapshot.status === "cooldown" ? "corens-beacon-cooldown-card" : undefined}
      >
        <div className="corens-stack corens-gap-sm">
          <div className="corens-inline-head">
            <TimerReset size={18} />
            <h3 className="corens-card-title">Пауза между включениями</h3>
          </div>
          <p className="corens-copy corens-copy-muted">
            {snapshot.status === "cooldown"
              ? "После выключения маяка нужна короткая пауза. Следующее включение станет доступно совсем скоро."
              : "Если выключить маяк, следующее включение будет доступно через 15 минут."}
          </p>
          {snapshot.status === "cooldown" && snapshot.cooldownUntil ? (
            <div className="corens-beacon-cooldown-value">
              <span className="corens-eyebrow">Можно включить через</span>
              <BeaconCountdown
                targetAt={snapshot.cooldownUntil}
                fallbackLabel={snapshot.cooldownLabel ?? "15:00"}
                emphasized
              />
            </div>
          ) : null}
        </div>
      </Panel>
    </AppSurface>
  );
}
