import { Heart, MoonStar, Orbit, Sparkle } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, Button, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { updateStateIntentAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

const stateIcons = [Heart, MoonStar, Sparkle, Orbit];

export default async function StateIntentPage() {
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
      <TopBar title="Настроение и формат" backHref="/profile" />

      <form action={updateStateIntentAction} className="corens-stack corens-gap-sm">
        <Section
          title="Как вы сейчас?"
          description="Это помогает нам искать тех, кто сейчас чувствует похожее."
        >
          <div className="corens-choice-grid">
            {snapshot.state.options.map((option, index) => {
              const Icon = stateIcons[index % stateIcons.length];

              return (
                <label key={option.key} className="corens-choice-label">
                  <input
                    className="corens-choice-input"
                    type="radio"
                    name="stateKey"
                    value={option.key}
                    defaultChecked={option.key === snapshot.state.current.key}
                  />
                  <span className="corens-choice-card">
                    <span className="corens-choice-header">
                      <span className="corens-choice-icon">
                        <Icon size={20} />
                      </span>
                    </span>
                    <strong className="corens-choice-title">{option.label}</strong>
                    <span className="corens-choice-description">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        <Panel tone="muted">
          <div className="corens-stack corens-gap-sm">
            <strong className="corens-card-title">Сейчас у вас</strong>
            <p className="corens-copy corens-copy-muted">
              {snapshot.state.current.description}
            </p>
            <span className="corens-eyebrow corens-mono">{snapshot.state.cooldownLabel}</span>
          </div>
        </Panel>

        <Section
          title="Как вам комфортно общаться?"
          description="Это помогает встретить человека с похожим ожиданием."
        >
          <div className="corens-choice-grid">
            {snapshot.intent.options.map((option, index) => {
              const Icon = stateIcons[(index + 1) % stateIcons.length];

              return (
                <label key={option.key} className="corens-choice-label">
                  <input
                    className="corens-choice-input"
                    type="radio"
                    name="intentKey"
                    value={option.key}
                    defaultChecked={option.key === snapshot.intent.current.key}
                  />
                  <span className="corens-choice-card">
                    <span className="corens-choice-header">
                      <span className="corens-choice-icon">
                        <Icon size={20} />
                      </span>
                    </span>
                    <strong className="corens-choice-title">{option.label}</strong>
                    <span className="corens-choice-description">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        <NoticeCard
          title="Это влияет на поиск"
          description="После сохранения мы обновим, кого ищем для вас."
        />

        <Button type="submit">Сохранить</Button>
      </form>
    </AppSurface>
  );
}
