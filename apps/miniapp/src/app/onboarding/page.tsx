import { Compass, Heart, MoonStar, Orbit, Sparkle } from "lucide-react";
import { redirect } from "next/navigation";
import type { SelectOption } from "@corens/domain";
import { AppSurface, Field, Panel, Section, TopBar } from "@corens/ui";
import { lightStateKeys, shadowStateKeys } from "@corens/domain/profile-options";

import { completeOnboardingAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { OnboardingFormActions } from "../../components/onboarding-form-actions";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

const optionIcons = [Heart, MoonStar, Sparkle, Orbit];

function splitStateOptions(options: ReadonlyArray<SelectOption>) {
  return {
    light: options.filter((option) => lightStateKeys.has(option.key)),
    shadow: options.filter((option) => shadowStateKeys.has(option.key))
  };
}

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

  const stateGroups = splitStateOptions(snapshot.state.options);

  return (
    <AppSurface>
      <TopBar title="Добро пожаловать" subtitle="Давайте познакомимся" />

      <Panel className="corens-hero-card">
        <div className="corens-hero-copy">
          <span className="corens-eyebrow">Первый шаг</span>
          <h2 className="corens-hero-title">Расскажите немного о себе</h2>
          <p className="corens-copy corens-copy-muted">
            Пока вы не заполнили профиль, поиск близкого человека не начнётся.
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

        <Section title="Как вы сейчас?">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-choice-section">
              <span className="corens-eyebrow">Светлые состояния</span>
              <div className="corens-choice-grid corens-choice-grid-bento">
                {stateGroups.light.map((option, index) => {
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
                      <span className="corens-choice-card corens-choice-card-bento">
                        <span className="corens-choice-header">
                          <span className="corens-choice-icon">
                            <Icon size={18} />
                          </span>
                        </span>
                        <strong className="corens-choice-title">{option.label}</strong>
                        <span className="corens-choice-description">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="corens-choice-section">
              <span className="corens-eyebrow">Теневые состояния</span>
              <div className="corens-choice-grid corens-choice-grid-bento">
                {stateGroups.shadow.map((option, index) => {
                  const Icon = optionIcons[(index + 2) % optionIcons.length];

                  return (
                    <label key={option.key} className="corens-choice-label">
                      <input
                        className="corens-choice-input"
                        type="radio"
                        name="stateKey"
                        value={option.key}
                        defaultChecked={option.key === snapshot.state.current.key}
                      />
                      <span className="corens-choice-card corens-choice-card-bento corens-choice-card-shadow">
                        <span className="corens-choice-header">
                          <span className="corens-choice-icon">
                            <Icon size={18} />
                          </span>
                        </span>
                        <strong className="corens-choice-title">{option.label}</strong>
                        <span className="corens-choice-description">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Какое общение вам близко?">
          <div className="corens-choice-grid corens-choice-grid-bento">
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

        <OnboardingFormActions
          groups={snapshot.trustKeys.groups}
          selected={snapshot.trustKeys.selected}
        />
      </form>
    </AppSurface>
  );
}
