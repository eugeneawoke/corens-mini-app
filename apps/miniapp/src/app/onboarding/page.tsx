import { Compass } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface } from "@corens/ui";

import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { OnboardingFormActions } from "../../components/onboarding-form-actions";
import { OnboardingIntentSelector } from "../../components/onboarding-intent-selector";
import { OnboardingStateSelector } from "../../components/onboarding-state-selector";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";
import { CONVERSATION_COPY } from "../../lib/conversation-copy";

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

  const intentSection = (
    <section
      id="onboarding-intent"
      className="corens-onboarding-section"
      data-onboarding-section="intent"
      data-requirement="optional"
    >
      <div className="corens-onboarding-section-heading">
        <span className="corens-onboarding-section-number" aria-hidden="true">01</span>
        <div className="corens-onboarding-section-copy">
          <div className="corens-onboarding-section-meta">
            <span className="corens-eyebrow">Разговор сейчас</span>
            <span className="corens-requirement-badge corens-requirement-optional">
              Можно пропустить
            </span>
          </div>
          <h2 className="corens-section-title">Какого разговора вам хочется?</h2>
          <p className="corens-copy corens-copy-muted">
            {CONVERSATION_COPY.intentExplanation}
          </p>
        </div>
      </div>

      <OnboardingIntentSelector
        options={snapshot.intent.options}
        currentKey={snapshot.intent.current.key}
      />
    </section>
  );

  const stateSection = (
    <section
      id="onboarding-state"
      className="corens-onboarding-section"
      data-onboarding-section="state"
      data-requirement="required"
    >
      <div className="corens-onboarding-section-heading">
        <span className="corens-onboarding-section-number" aria-hidden="true">02</span>
        <div className="corens-onboarding-section-copy">
          <div className="corens-onboarding-section-meta">
            <span className="corens-eyebrow">Контекст и темп</span>
            <span className="corens-requirement-badge">Обязательно</span>
          </div>
          <h2 className="corens-section-title">Как вы сейчас?</h2>
          <p className="corens-copy corens-copy-muted">
            {CONVERSATION_COPY.stateExplanation} Здесь нет правильного или неправильного
            состояния — важен честный ответ про этот момент.
          </p>
        </div>
      </div>

      <OnboardingStateSelector
        options={snapshot.state.options}
        currentKey={snapshot.state.current.key}
      />
    </section>
  );

  return (
    <AppSurface>
      <header className="corens-onboarding-hero">
        <div className="corens-onboarding-hero-mark" aria-hidden="true">
          <Compass size={22} strokeWidth={1.7} />
        </div>
        <span className="corens-eyebrow">Настройка первого поиска</span>
        <h1 className="corens-onboarding-title">Соберём контекст для хорошего разговора</h1>
      </header>

      <OnboardingFormActions
        groups={snapshot.trustKeys.groups}
        selected={snapshot.trustKeys.selected}
        intentSection={intentSection}
        stateSection={stateSection}
      />
    </AppSurface>
  );
}
