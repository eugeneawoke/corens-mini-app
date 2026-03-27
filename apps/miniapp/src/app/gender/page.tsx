import { redirect } from "next/navigation";
import { AppSurface, Button, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { updateGenderPreferenceAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

const partnerGenderOptions = [
  {
    key: "all",
    label: "Все",
    description: "Показывать людей любого пола"
  },
  {
    key: "same",
    label: "Мой пол",
    description: "Показывать только людей моего пола"
  },
  {
    key: "opposite",
    label: "Противоположный",
    description: "Показывать только людей противоположного пола"
  }
] as const;

const genderLabels: Record<string, string> = {
  male: "Мужской",
  female: "Женский"
};

export default async function GenderPage() {
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
    redirect("/onboarding/intro");
  }

  return (
    <AppSurface>
      <TopBar title="Пол и поиск" backHref="/profile" />

      <Panel tone="muted">
        <div className="corens-stack corens-gap-xs">
          <span className="corens-eyebrow">Ваш пол</span>
          <strong className="corens-section-title">
            {genderLabels[snapshot.profile.gender] ?? "Не указан"}
          </strong>
        </div>
      </Panel>

      <form action={updateGenderPreferenceAction} className="corens-stack corens-gap-sm">
        <Section
          title="Кого искать?"
          description="Это влияет на то, с кем вас будут сопоставлять при поиске."
        >
          <div className="corens-choice-grid corens-choice-grid-bento">
            {partnerGenderOptions.map((option) => (
              <label key={option.key} className="corens-choice-label">
                <input
                  className="corens-choice-input"
                  type="radio"
                  name="partnerGender"
                  value={option.key}
                  defaultChecked={option.key === snapshot.profile.partnerGender}
                />
                <span className="corens-choice-card corens-choice-card-bento">
                  <strong className="corens-choice-title">{option.label}</strong>
                  <span className="corens-choice-description">{option.description}</span>
                </span>
              </label>
            ))}
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
