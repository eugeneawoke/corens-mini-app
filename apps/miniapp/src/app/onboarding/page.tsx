import { Compass, Heart, MoonStar, Orbit, Sparkle } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, Button, Field, KeyChip, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { completeOnboardingAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

const optionIcons = [Heart, MoonStar, Sparkle, Orbit];

export default async function OnboardingPage() {
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

  if (snapshot.onboardingCompleted) {
    redirect("/");
  }

  return (
    <AppSurface>
      <TopBar title="Онбординг" subtitle="Первый запуск" />

      <Panel className="corens-hero-card">
        <div className="corens-hero-copy">
          <span className="corens-eyebrow">Старт</span>
          <h2 className="corens-hero-title">Сначала профиль, потом matching</h2>
          <p className="corens-copy corens-copy-muted">
            Пока вы не завершили онбординг, активная связь, consent и Beacon недоступны.
          </p>
        </div>
        <div className="corens-hero-orbit">
          <div className="corens-cloud" />
          <div className="corens-crystal">
            <Compass size={18} />
          </div>
        </div>
      </Panel>

      <form action={completeOnboardingAction} className="corens-stack corens-gap-sm">
        <Section title="Как вас показывать?">
          <Panel>
            <Field
              name="displayName"
              label="Имя в профиле"
              defaultValue={snapshot.profile.displayName === "Новый профиль" ? "" : snapshot.profile.displayName}
              placeholder="Например, Мария"
              minLength={2}
              maxLength={48}
              required
            />
          </Panel>
        </Section>

        <Section title="Ваш state">
          <div className="corens-choice-grid">
            {snapshot.state.options.map((option, index) => {
              const Icon = optionIcons[index % optionIcons.length];

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

        <Section title="Ваш intent">
          <div className="corens-choice-grid">
            {snapshot.intent.options.map((option, index) => {
              const Icon = optionIcons[(index + 1) % optionIcons.length];

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

        <Section title="Ключи доверия">
          <Panel className="corens-stack corens-gap-sm">
            {snapshot.trustKeys.groups.map((group) => (
              <div key={group.title} className="corens-stack corens-gap-xs">
                <strong className="corens-card-title">{group.title}</strong>
                <div className="corens-chip-row">
                  {group.items.map((item) => (
                    <label key={item} className="corens-chip-checkbox">
                      <input
                        type="checkbox"
                        name="trustKeys"
                        value={item}
                        defaultChecked={snapshot.trustKeys.selected.includes(item)}
                      />
                      <KeyChip active={snapshot.trustKeys.selected.includes(item)}>{item}</KeyChip>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
        </Section>

        <NoticeCard
          title="Что будет дальше"
          description="После сохранения вы попадете на `/connection` без фиктивной связи. Matching появится только когда backend реально создаст match session."
        />

        <Button type="submit">Завершить онбординг</Button>
      </form>
    </AppSurface>
  );
}
