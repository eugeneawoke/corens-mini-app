"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Step = "name" | "state" | "awaiting-scroll" | "trust-keys" | "done";

interface HintConfig {
  selector: string;
  title: string;
  text: string;
  dismissLabel?: string;
}

const HINTS: Partial<Record<Step, HintConfig>> = {
  name: {
    selector: "[data-onboarding='name-field']",
    title: "Добро пожаловать в Corens",
    text: "Это пространство для живого контакта с людьми рядом. Начните с имени — как вас зовут те, кому вы доверяете."
  },
  state: {
    selector: "[data-onboarding='state-section']",
    title: "Как вы сейчас?",
    text: "Выберите состояние. Светлое или теневое — оба честны. Если сейчас сложно, можно выбрать теневое состояние."
  },
  "trust-keys": {
    selector: "[data-onboarding='trust-keys-section']",
    title: "Ключи доверия",
    text: "Выберите что важно для вас в контакте с людьми. Совпадение ключей поможет найти тех, кто близок по духу.",
    dismissLabel: "Понятно"
  }
};

export function OnboardingTour() {
  const [step, setStep] = useState<Step>("name");
  const spotlightRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const clearSpotlight = useCallback(() => {
    if (spotlightRef.current) {
      spotlightRef.current.classList.remove("corens-tour-spotlight");
      spotlightRef.current = null;
    }
  }, []);

  const applySpotlight = useCallback(
    (selector: string, focusInput?: boolean) => {
      clearSpotlight();
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.add("corens-tour-spotlight");
      spotlightRef.current = el;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusInput) {
        const input = el.querySelector("input") as HTMLInputElement | null;
        if (input) setTimeout(() => input.focus(), 300);
      }
    },
    [clearSpotlight]
  );

  // Apply spotlight when step changes
  useEffect(() => {
    if (step === "done" || step === "awaiting-scroll") {
      clearSpotlight();
      return;
    }
    const hint = HINTS[step];
    if (hint) applySpotlight(hint.selector, step === "name");
  }, [step, applySpotlight, clearSpotlight]);

  // Name step: advance on blur when filled; mark empty field when blank
  useEffect(() => {
    if (step !== "name") return;
    const input = document.querySelector(
      "[data-onboarding='name-field'] input[name='displayName']"
    ) as HTMLInputElement | null;
    if (!input) return;

    const fieldWrap = input.closest<HTMLElement>(".corens-field-wrap");

    const handleBlur = () => {
      const val = input.value.trim();
      if (val.length >= 2) {
        fieldWrap?.classList.remove("corens-name-error");
        setStep("state");
      } else if (val.length === 0) {
        fieldWrap?.classList.add("corens-name-error");
      }
    };
    const handleFocus = () => fieldWrap?.classList.remove("corens-name-error");
    const handleKey = (e: Event) => {
      if ((e as KeyboardEvent).key === "Enter" && input.value.trim().length >= 2) {
        fieldWrap?.classList.remove("corens-name-error");
        setStep("state");
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

  // State step: advance on radio change
  useEffect(() => {
    if (step !== "state") return;
    const container = document.querySelector("[data-onboarding='state-section']");
    if (!container) return;

    const handleChange = () => {
      setTimeout(() => setStep("awaiting-scroll"), 350);
    };
    container.addEventListener("change", handleChange, { once: true });
    return () => container.removeEventListener("change", handleChange);
  }, [step]);

  // Awaiting scroll: IntersectionObserver on trust-keys section
  useEffect(() => {
    if (step !== "awaiting-scroll") return;
    const target = document.querySelector("[data-onboarding='trust-keys-section']");
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observerRef.current?.disconnect();
          setStep("trust-keys");
        }
      },
      { threshold: 0.3 }
    );
    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSpotlight();
      observerRef.current?.disconnect();
    };
  }, [clearSpotlight]);

  if (step === "done" || step === "awaiting-scroll") return null;

  const hint = HINTS[step];
  if (!hint) return null;

  return (
    <>
      <div className="corens-tour-backdrop" onClick={() => setStep("done")} />
      <div className="corens-tour-hint" role="dialog" aria-live="polite">
        <div className="corens-tour-hint-content">
          <strong className="corens-tour-hint-title">{hint.title}</strong>
          <p className="corens-tour-hint-text">{hint.text}</p>
        </div>
        <div className="corens-tour-hint-actions">
          {hint.dismissLabel ? (
            <button
              type="button"
              className="corens-tour-hint-btn-primary"
              onClick={() => setStep("done")}
            >
              {hint.dismissLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="corens-tour-hint-btn-skip"
            onClick={() => setStep("done")}
          >
            Пропустить
          </button>
        </div>
      </div>
    </>
  );
}
