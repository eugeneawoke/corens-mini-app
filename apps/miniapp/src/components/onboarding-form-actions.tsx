"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Field } from "@corens/ui";
import { completeOnboardingAction } from "../app/actions";
import { CONVERSATION_COPY } from "../lib/conversation-copy";
import type { ProfileContentActionState } from "../lib/profile-content-errors";
import { ProfileContentError } from "./profile-content-error";

type TrustKeyGroup = {
  title: string;
  items: readonly string[];
};

const GROUP_LIMITS = [3, 2];
const ONBOARDING_STEP_COUNT = 4;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="corens-stack corens-gap-sm">
      <button
        type="submit"
        disabled={disabled || pending}
        className="corens-button corens-button-primary"
        style={{ gap: "8px" }}
      >
        {pending ? (
          <>
            <Loader2 size={18} className="corens-spinner" />
            Начинаем…
          </>
        ) : (
          "Начать"
        )}
      </button>
      {pending ? (
        <p className="corens-onboarding-pending" aria-live="polite">
          Настраиваем ваш профиль — сейчас начнём искать близких вам людей.
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  groups: readonly TrustKeyGroup[];
  selected: string[];
  intentSection: ReactNode;
  stateSection: ReactNode;
};

export function OnboardingFormActions({
  groups,
  selected,
  intentSection,
  stateSection
}: Props) {
  const [actionState, formAction] = useActionState(completeOnboardingAction, null);
  const [checked, setChecked] = useState<string[]>(selected);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [displayName, setDisplayName] = useState("");
  const [dismissedDisplayNameErrorState, setDismissedDisplayNameErrorState] =
    useState<ProfileContentActionState>(null);
  const [gender, setGender] = useState("");

  function getGroupIndex(item: string): number {
    return groups.findIndex((group) => group.items.includes(item));
  }

  function countForGroup(groupIndex: number): number {
    return checked.filter((key) => groups[groupIndex]?.items.includes(key)).length;
  }

  function toggle(item: string) {
    setChecked((previous) => {
      if (previous.includes(item)) {
        return previous.filter((key) => key !== item);
      }

      const groupIndex = getGroupIndex(item);
      const limit = GROUP_LIMITS[groupIndex] ?? 3;
      const groupCount = previous.filter((key) =>
        groups[groupIndex]?.items.includes(key)
      ).length;

      if (groupCount >= limit) {
        return previous;
      }

      return [...previous, item];
    });
  }

  function isItemDisabled(item: string): boolean {
    if (checked.includes(item)) {
      return false;
    }

    const groupIndex = getGroupIndex(item);
    const limit = GROUP_LIMITS[groupIndex] ?? 3;
    return countForGroup(groupIndex) >= limit;
  }

  const isTrustValid = groups.every((_, groupIndex) => countForGroup(groupIndex) >= 1);
  const isIdentityValid = displayName.trim().length >= 2 && Boolean(gender);
  const displayNameError =
    actionState !== dismissedDisplayNameErrorState &&
    actionState?.error?.field === "displayName"
      ? actionState.error
      : null;
  const canContinue = currentStep === 0 || currentStep === 1
    ? true
    : currentStep === 2 ? isTrustValid : isIdentityValid;

  function goBack() {
    if (currentStep === 0) {
      return;
    }

    setDirection("back");
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function goNext() {
    if (!canContinue || currentStep >= ONBOARDING_STEP_COUNT - 1) {
      return;
    }

    setDirection("forward");
    setCurrentStep((step) => Math.min(ONBOARDING_STEP_COUNT - 1, step + 1));
  }

  const trustSection = (
    <section
      id="onboarding-trust"
      className="corens-onboarding-section"
      data-onboarding="trust-keys-section"
      data-onboarding-section="trust"
      data-requirement="required"
    >
      <div className="corens-onboarding-section-heading">
        <span className="corens-onboarding-section-number" aria-hidden="true">03</span>
        <div className="corens-onboarding-section-copy">
          <div className="corens-onboarding-section-meta">
            <span className="corens-eyebrow">Комфорт и безопасность</span>
            <span className="corens-requirement-badge">Обязательно</span>
          </div>
          <h2 className="corens-section-title">Что для вас важно в контакте?</h2>
          <p className="corens-copy corens-copy-muted">
            {CONVERSATION_COPY.trustKeysExplanation}
          </p>
        </div>
      </div>

      <div className="corens-onboarding-trust-groups">
        {groups.map((group, groupIndex) => {
          const limit = GROUP_LIMITS[groupIndex] ?? 3;
          const groupCount = countForGroup(groupIndex);
          const requirement = groupIndex === 0 ? "Выберите от 1 до 3" : "Выберите от 1 до 2";

          return (
            <fieldset key={group.title} className="corens-onboarding-trust-group">
              <legend className="corens-card-title">{group.title}</legend>
              <div className="corens-onboarding-group-rule">
                <span>{requirement}</span>
                <span
                  className="corens-onboarding-group-count"
                  data-complete={String(groupCount > 0)}
                >
                  Выбрано {groupCount} из {limit}
                </span>
              </div>
              <div className="corens-chip-row">
                {group.items.map((item) => {
                  const active = checked.includes(item);
                  const disabled = isItemDisabled(item);

                  return (
                    <label
                      key={item}
                      className="corens-chip-checkbox"
                      data-disabled={String(disabled)}
                    >
                      <input
                        type="checkbox"
                        name="trustKeys"
                        value={item}
                        checked={active}
                        disabled={disabled}
                        onChange={() => toggle(item)}
                      />
                      <span
                        className={["corens-chip", active ? "corens-chip-active" : ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );

  const identitySection = (
    <section
      id="onboarding-identity"
      className="corens-onboarding-section"
      data-onboarding-section="identity"
      data-requirement="required"
    >
      <div className="corens-onboarding-section-heading">
        <span className="corens-onboarding-section-number" aria-hidden="true">04</span>
        <div className="corens-onboarding-section-copy">
          <div className="corens-onboarding-section-meta">
            <span className="corens-eyebrow">Профиль для знакомства</span>
            <span className="corens-requirement-badge">Обязательно</span>
          </div>
          <h2 className="corens-section-title">Как вас представить?</h2>
          <p className="corens-copy corens-copy-muted">
            Другой человек увидит имя. Пол нужен только для настроек подбора.
          </p>
        </div>
      </div>

      <div className="corens-onboarding-identity-grid">
        <div className="corens-panel" data-onboarding="name-field">
          <Field
            name="displayName"
            label="Имя в профиле"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.currentTarget.value);
              if (displayNameError) {
                setDismissedDisplayNameErrorState(actionState);
              }
            }}
            aria-describedby={displayNameError ? "display-name-content-error" : undefined}
            aria-invalid={Boolean(displayNameError)}
            minLength={2}
            maxLength={48}
            required
          />
          <span className="corens-onboarding-field-note">Минимум 2 символа</span>
          <ProfileContentError
            state={actionState}
            dismissedState={dismissedDisplayNameErrorState}
            field="displayName"
            id="display-name-content-error"
          />
        </div>

        <div className="corens-panel" data-onboarding="gender-field">
          <fieldset className="corens-onboarding-fieldset">
            <legend className="corens-label">Пол</legend>
            <span className="corens-onboarding-field-note">Выберите один вариант</span>
            <div className="corens-choice-grid corens-onboarding-gender-grid">
              <label className="corens-choice-label">
                <input
                  className="corens-choice-input"
                  type="radio"
                  name="gender"
                  value="male"
                  required
                  checked={gender === "male"}
                  onChange={() => setGender("male")}
                />
                <span className="corens-choice-card corens-choice-card-compact">
                  <strong className="corens-choice-title">Мужской</strong>
                </span>
              </label>
              <label className="corens-choice-label">
                <input
                  className="corens-choice-input"
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === "female"}
                  onChange={() => setGender("female")}
                />
                <span className="corens-choice-card corens-choice-card-compact">
                  <strong className="corens-choice-title">Женский</strong>
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      <footer className="corens-onboarding-submit">
        <div className="corens-onboarding-submit-copy">
          <span className="corens-eyebrow">После сохранения</span>
          <strong className="corens-card-title">Corens начнёт искать подходящего человека</strong>
          <p className="corens-copy corens-copy-muted">
            Будут учтены выбранный разговор, текущее состояние и ключи доверия.
          </p>
        </div>
        <SubmitButton disabled={!isTrustValid || !isIdentityValid} />
      </footer>
    </section>
  );

  const steps = [intentSection, stateSection, trustSection, identitySection];

  return (
    <form action={formAction} className="corens-onboarding-form">
      <div className="corens-onboarding-flow">
      <div
        className="corens-onboarding-progress"
        aria-label={`Шаг ${currentStep + 1} из ${ONBOARDING_STEP_COUNT}`}
      >
        <span className="corens-onboarding-progress-count">
          {String(currentStep + 1).padStart(2, "0")}
          <small> / {String(ONBOARDING_STEP_COUNT).padStart(2, "0")}</small>
        </span>
        <span className="corens-onboarding-progress-track" aria-hidden="true">
          <span style={{ width: `${((currentStep + 1) / ONBOARDING_STEP_COUNT) * 100}%` }} />
        </span>
      </div>

      <div
        className="corens-onboarding-deck"
        data-direction={direction}
        data-onboarding-step-active="true"
      >
        {steps.map((step, index) => (
          <div
            key={index}
            className="corens-onboarding-step"
            hidden={currentStep !== index}
            aria-hidden={currentStep !== index}
          >
            {step}
          </div>
        ))}
      </div>

      <div className="corens-onboarding-navigation">
        <button
          type="button"
          aria-label="Назад"
          className="corens-onboarding-navigation-button corens-onboarding-navigation-back"
          onClick={goBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
          Назад
        </button>

        <span className="corens-onboarding-navigation-position" aria-live="polite">
          {currentStep + 1} из {ONBOARDING_STEP_COUNT}
        </span>

        {currentStep === ONBOARDING_STEP_COUNT - 1 ? (
          <span className="corens-onboarding-navigation-end" aria-hidden="true" />
        ) : (
          <button
            type="button"
            aria-label="Дальше"
            className="corens-onboarding-navigation-button corens-onboarding-navigation-next"
            onClick={goNext}
            disabled={!canContinue}
          >
            Дальше
            <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>
      </div>
    </form>
  );
}
