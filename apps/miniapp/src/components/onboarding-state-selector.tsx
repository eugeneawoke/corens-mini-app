"use client";

import { Cloud, Heart, MoonStar, Orbit, Sparkle } from "lucide-react";
import { useState } from "react";
import type { SelectOption } from "@corens/domain";

const stateIcons = [Heart, MoonStar, Sparkle, Orbit, Cloud];

export function OnboardingStateSelector({
  options,
  currentKey
}: {
  options: ReadonlyArray<SelectOption>;
  currentKey: string;
}) {
  const initialKey = options.some((option) => option.key === currentKey)
    ? currentKey
    : (options[0]?.key ?? "");
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const selected = options.find((option) => option.key === selectedKey) ?? options[0];

  return (
    <fieldset className="corens-onboarding-fieldset" data-onboarding="state-section">
      <legend className="corens-visually-hidden">Выберите текущее состояние</legend>
      <div className="corens-onboarding-state-cloud">
        {options.map((option, index) => {
          const Icon = stateIcons[index % stateIcons.length];

          return (
            <label
              key={option.key}
              className="corens-onboarding-state-option"
              {...(index === 0 ? { "data-onboarding": "first-state-card" } : {})}
            >
              <input
                className="corens-choice-input"
                type="radio"
                name="stateKey"
                value={option.key}
                required={index === 0}
                checked={selectedKey === option.key}
                onChange={() => setSelectedKey(option.key)}
              />
              <span className="corens-onboarding-state-pill">
                <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                <span>{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>

      {selected ? (
        <div className="corens-onboarding-state-readout" aria-live="polite">
          <span className="corens-eyebrow">Выбрано сейчас</span>
          <strong>{selected.label}</strong>
          <p>{selected.description}</p>
        </div>
      ) : null}
    </fieldset>
  );
}
