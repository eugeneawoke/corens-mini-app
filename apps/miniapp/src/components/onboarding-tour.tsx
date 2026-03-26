"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Step = "name" | "gender" | "state" | "done";

interface HintConfig {
  selector: string;
  title: string;
  text: string;
}

const HINTS: Record<Exclude<Step, "done">, HintConfig> = {
  name: {
    selector: "[data-onboarding='name-field']",
    title: "Добро пожаловать в Corens",
    text: "Это пространство для живого контакта с людьми рядом. Начните с имени — как вас зовут те, кому вы доверяете."
  },
  gender: {
    selector: "[data-onboarding='gender-field']",
    title: "Пол в профиле",
    text: "По умолчанию мы ищем людей любого пола. В настройках профиля можно уточнить — искать только своего или противоположного пола."
  },
  state: {
    selector: "[data-onboarding='first-state-card']",
    title: "Как вы сейчас?",
    text: "Выберите состояние. Светлое или теневое — оба честны. Если сейчас сложно, можно выбрать теневое состояние."
  }
};

const NAME_SKIP_TEXT =
  "Нам нужно хотя бы короткое имя, чтобы вас представить — как вас называют близкие? Достаточно двух символов.";

export function OnboardingTour() {
  const [step, setStep] = useState<Step>("name");
  const [nameSkipAttempted, setNameSkipAttempted] = useState(false);
  const spotlightRef = useRef<Element | null>(null);

  const clearSpotlight = useCallback(() => {
    if (spotlightRef.current) {
      spotlightRef.current.classList.remove("corens-tour-spotlight");
      spotlightRef.current = null;
    }
  }, []);

  const applySpotlight = useCallback(
    (selector: string, focusInput?: boolean, scroll = true) => {
      clearSpotlight();
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.add("corens-tour-spotlight");
      spotlightRef.current = el;
      if (scroll) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusInput) {
        const input = el.querySelector("input") as HTMLInputElement | null;
        if (input) setTimeout(() => input.focus(), 300);
      }
    },
    [clearSpotlight]
  );

  const getNameInput = () =>
    document.querySelector(
      "[data-onboarding='name-field'] input[name='displayName']"
    ) as HTMLInputElement | null;

  // Apply spotlight when step changes
  useEffect(() => {
    if (step === "done") {
      clearSpotlight();
      return;
    }
    const hint = HINTS[step];
    if (step === "gender") {
      (document.activeElement as HTMLElement | null)?.blur();
      applySpotlight(hint.selector, false, false);
    } else {
      applySpotlight(hint.selector, step === "name");
    }
  }, [step, applySpotlight, clearSpotlight]);

  // Name step: advance on blur/Enter when filled; mark empty field when blank
  useEffect(() => {
    if (step !== "name") return;
    const input = getNameInput();
    if (!input) return;

    const fieldWrap = input.closest<HTMLElement>(".corens-field-wrap");

    const handleBlur = () => {
      const val = input.value.trim();
      if (val.length >= 2) {
        fieldWrap?.classList.remove("corens-name-error");
        setNameSkipAttempted(false);
        setStep("gender");
      } else if (val.length === 0) {
        fieldWrap?.classList.add("corens-name-error");
      }
    };
    const handleFocus = () => fieldWrap?.classList.remove("corens-name-error");
    const handleKey = (e: Event) => {
      if ((e as KeyboardEvent).key === "Enter" && input.value.trim().length >= 2) {
        fieldWrap?.classList.remove("corens-name-error");
        setNameSkipAttempted(false);
        setStep("gender");
      }
    };

    input.addEventListener("blur", handleBlur);
    input.addEventListener("focus", handleFocus);
    input.addEventListener("keydown", handleKey);
    return () => {
      input.removeEventListener("blur", handleBlur);
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("keydown", handleKey);
      fieldWrap?.classList.remove("corens-name-error");
    };
  }, [step]);

  // Gender step: advance on radio change
  useEffect(() => {
    if (step !== "gender") return;
    const container = document.querySelector("[data-onboarding='gender-field']");
    if (!container) return;

    const handleChange = () => setTimeout(() => setStep("state"), 200);
    container.addEventListener("change", handleChange, { once: true });
    return () => container.removeEventListener("change", handleChange);
  }, [step]);

  // State step: advance on radio change OR click on spotlight card
  useEffect(() => {
    if (step !== "state") return;
    const container = document.querySelector("[data-onboarding='state-section']");
    const card = document.querySelector("[data-onboarding='first-state-card']");
    if (!container) return;

    const advance = () => setStep("done");
    const advanceDelayed = () => setTimeout(advance, 350);

    container.addEventListener("change", advanceDelayed, { once: true });
    card?.addEventListener("click", advance, { once: true });
    return () => {
      container.removeEventListener("change", advanceDelayed);
      card?.removeEventListener("click", advance);
    };
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearSpotlight();
  }, [clearSpotlight]);

  const handleBackdropClick = () => {
    if (step === "name") {
      const input = getNameInput();
      const val = input?.value.trim() ?? "";
      if (val.length >= 2) {
        setNameSkipAttempted(false);
        input?.closest<HTMLElement>(".corens-field-wrap")?.classList.remove("corens-name-error");
        setStep("gender");
      } else {
        setNameSkipAttempted(true);
        input?.closest<HTMLElement>(".corens-field-wrap")?.classList.add("corens-name-error");
      }
      return;
    }
    if (step === "gender") return;
    setStep("done");
  };

  if (step === "done") return null;

  const hint = HINTS[step];
  const hintText = step === "name" && nameSkipAttempted ? NAME_SKIP_TEXT : hint.text;

  return (
    <>
      <div className="corens-tour-backdrop" onClick={handleBackdropClick} />
      <div
        className="corens-tour-hint"
        role="dialog"
        aria-live="polite"
        onClick={step === "state" ? () => setStep("done") : undefined}
      >
        <div className="corens-tour-hint-content">
          <strong className="corens-tour-hint-title">{hint.title}</strong>
          <p className="corens-tour-hint-text">{hintText}</p>
        </div>
        {step !== "name" && step !== "gender" ? (
          <div className="corens-tour-hint-actions">
            <button
              type="button"
              className="corens-tour-hint-btn-skip"
              onClick={() => setStep("done")}
            >
              Пропустить
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
