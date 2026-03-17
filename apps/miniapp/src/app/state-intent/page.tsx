import { Heart, MoonStar, Orbit, Sparkle } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, Button, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { updateStateIntentAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { getProfileSummary, MiniAppSessionRequiredError } from "../../lib/api";

const stateIcons = [Heart, MoonStar, Sparkle, Orbit];

export default async function StateIntentPage() {
  let snapshot;

  try {
    snapshot = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    throw error;
  }

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface>
      <TopBar title="State и Intent" backHref="/profile" />

      <form action={updateStateIntentAction} className="corens-stack corens-gap-sm">
        <Section
          title="Как вы сейчас?"
          description="Первый блок описывает текущее состояние и помогает matching policy выбрать корректный контекст."
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
            <strong className="corens-card-title">Текущее описание</strong>
            <p className="corens-copy corens-copy-muted">
              {snapshot.state.current.description}
            </p>
            <span className="corens-eyebrow corens-mono">{snapshot.state.cooldownLabel}</span>
          </div>
        </Panel>

        <Section
          title="Какой ритм контакта вам нужен?"
          description="Intent меняет ожидание от взаимодействия и должен быть предельно ясным."
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
          title="Сохранение"
          description="Изменение сохраняется на backend и влияет на алгоритм матрицы совпадений."
        />

        <Button type="submit">Сохранить изменения</Button>
      </form>
    </AppSurface>
  );
}
