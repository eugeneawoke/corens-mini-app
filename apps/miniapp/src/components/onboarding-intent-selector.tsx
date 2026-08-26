"use client";

import { Heart, MessageCircle, MoonStar, Orbit, Sparkles, Wind } from "lucide-react";
import { useState } from "react";
import type { SelectOption } from "@corens/domain";
import { optionalIntentOption } from "@corens/domain/profile-options";

const intentIcons = [Heart, MessageCircle, Wind, Orbit, Sparkles, MoonStar];

export function OnboardingIntentSelector({
  options,
  currentKey
}: {
  options: ReadonlyArray<SelectOption>;
  currentKey: string;
}) {
  const allOptions = [...options, optionalIntentOption];
  const initialKey = allOptions.some((option) => option.key === currentKey)
    ? currentKey
    : optionalIntentOption.key;
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const selected = allOptions.find((option) => option.key === selectedKey)
    ?? optionalIntentOption;

  return (
    <fieldset className="corens-onboarding-fieldset">
      <legend className="corens-visually-hidden">Выберите желаемый разговор</legend>
      <div className="corens-onboarding-intent-cloud">
        {allOptions.map((option, index) => {
          const Icon = intentIcons[index % intentIcons.length];
          const isOptional = option.key === optionalIntentOption.key;

          return (
            <label
              key={option.key || "no-intent"}
              className="corens-onboarding-intent-option"
              data-optional={String(isOptional)}
            >
              <input
                className="corens-choice-input"
                type="radio"
                name="intentKey"
                value={option.key}
                checked={selectedKey === option.key}
                onChange={() => setSelectedKey(option.key)}
              />
              <span className="corens-onboarding-intent-pill">
                <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                <span>{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="corens-onboarding-intent-readout" aria-live="polite">
        <span className="corens-eyebrow">Выбрано сейчас</span>
        <strong>{selected.label}</strong>
        <p>{selected.description}</p>
      </div>
    </fieldset>
  );
}
