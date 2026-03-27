"use client";

import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type TrustKeyGroup = {
  title: string;
  items: readonly string[];
};

// Per-group limits: group[0] max 3, group[1] max 2
const GROUP_LIMITS = [3, 2];

function focusRequiredGenderField() {
  const container = document.querySelector("[data-onboarding='gender-field']") as HTMLElement | null;
  const panel = container?.querySelector(".corens-panel") as HTMLElement | null;
  const firstInput = container?.querySelector("input[name='gender']") as HTMLInputElement | null;

  if (!container || !panel) {
    return;
  }

  panel.classList.remove("corens-panel-attention");
  void panel.offsetWidth;
  panel.classList.add("corens-panel-attention");
  container.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => panel.classList.remove("corens-panel-attention"), 1400);
  firstInput?.focus();
}

// ─── Submit button (reads useFormStatus from parent form) ─────────────────────

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const hasGender = Boolean(form?.querySelector("input[name='gender']:checked"));

    if (hasGender) {
      return;
    }

    event.preventDefault();
    focusRequiredGenderField();
  }

  return (
    <div className="corens-stack corens-gap-sm">
      <button
        type="submit"
        disabled={isDisabled}
        className="corens-button corens-button-primary"
        style={{ gap: "8px" }}
        onClick={handleClick}
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
      {pending && (
        <p
          className="corens-copy corens-copy-muted"
          style={{ textAlign: "center", fontSize: "14px" }}
        >
          Настраиваем ваш профиль — сейчас начнём искать близких вам людей.
        </p>
      )}
    </div>
  );
}

// ─── Full trust-keys + submit footer ─────────────────────────────────────────

type Props = {
  groups: readonly TrustKeyGroup[];
  selected: string[];
};

export function OnboardingFormActions({ groups, selected }: Props) {
  const [checked, setChecked] = useState<string[]>(selected);

  function getGroupIndex(item: string): number {
    return groups.findIndex((g) => g.items.includes(item));
  }

  function countForGroup(gi: number): number {
    return checked.filter((k) => groups[gi]?.items.includes(k)).length;
  }

  function toggle(item: string) {
    setChecked((prev) => {
      if (prev.includes(item)) {
        return prev.filter((k) => k !== item);
      }
      const gi = getGroupIndex(item);
      const limit = GROUP_LIMITS[gi] ?? 3;
      if (countForGroup(gi) >= limit) return prev;
      return [...prev, item];
    });
  }

  function isItemDisabled(item: string): boolean {
    if (checked.includes(item)) return false;
    const gi = getGroupIndex(item);
    const limit = GROUP_LIMITS[gi] ?? 3;
    return countForGroup(gi) >= limit;
  }

  // Valid when at least 1 key selected from each group
  const isValid = groups.every((_, gi) => countForGroup(gi) >= 1);

  return (
    <>
      {/* ── Trust keys ── */}
      <section className="corens-section" data-onboarding="trust-keys-section">
        <div className="corens-section-header">
          <h2 className="corens-section-title">Ключи доверия</h2>
        </div>

        <div className="corens-panel corens-stack corens-gap-sm">
          <p style={{ margin: 0, fontSize: "14px", color: "var(--corens-text-secondary)", lineHeight: 1.5 }}>
            Выберите хотя бы один ключ в каждой группе — это поможет найти человека, близкого по духу
          </p>
          {groups.map((group, gi) => {
            const limit = GROUP_LIMITS[gi] ?? 3;
            const groupCount = countForGroup(gi);

            return (
              <div key={group.title} className="corens-stack corens-gap-xs">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong className="corens-card-title">{group.title}</strong>
                  <span
                    className="corens-eyebrow"
                    style={{ color: groupCount === 0 ? "var(--corens-warning)" : undefined }}
                  >
                    {groupCount}/{limit}
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
                        style={{
                          opacity: disabled ? 0.4 : 1,
                          cursor: disabled ? "default" : "pointer"
                        }}
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
                          className={["corens-chip", active ? "corens-chip-active" : ""].filter(Boolean).join(" ")}
                        >
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Notice ── */}
      <div className="corens-panel corens-panel-muted">
        <div className="corens-notice">
          <div className="corens-notice-copy">
            <strong className="corens-card-title">После этого</strong>
            <p className="corens-copy corens-copy-muted">
              Мы начнём искать человека с совместимым состоянием, хотя бы одним общим ключом и подходящим ритмом контакта.
            </p>
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <SubmitButton disabled={!isValid} />
    </>
  );
}
