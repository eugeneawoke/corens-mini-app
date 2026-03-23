"use client";

import { useState } from "react";

type TrustKeyGroup = {
  title: string;
  items: readonly string[];
};

type Props = {
  groups: readonly TrustKeyGroup[];
  selected: string[];
  showHint?: boolean;
};

// The second group ("Качество контакта") has a lower per-group limit
const TOTAL_LIMIT = 3;
const QUALITY_GROUP_LIMIT = 2;

export function TrustKeysSelector({ groups, selected, showHint = false }: Props) {
  const [checked, setChecked] = useState<string[]>(selected);

  const qualityGroupTitle = groups[1]?.title ?? "";

  const totalSelected = checked.length;
  const qualitySelected = checked.filter((k) =>
    groups[1]?.items.includes(k)
  ).length;

  function toggle(item: string, groupTitle: string) {
    setChecked((prev) => {
      if (prev.includes(item)) {
        return prev.filter((k) => k !== item);
      }

      if (prev.length >= TOTAL_LIMIT) return prev;

      const isQualityGroup = groupTitle === qualityGroupTitle;
      if (isQualityGroup && qualitySelected >= QUALITY_GROUP_LIMIT) return prev;

      return [...prev, item];
    });
  }

  function isDisabled(item: string, groupTitle: string): boolean {
    if (checked.includes(item)) return false;
    if (totalSelected >= TOTAL_LIMIT) return true;
    if (groupTitle === qualityGroupTitle && qualitySelected >= QUALITY_GROUP_LIMIT) return true;
    return false;
  }

  return (
    <div className="corens-stack corens-gap-sm">
      {showHint && (
        <p className="corens-field-hint" style={{ fontSize: "13px", color: "var(--corens-text-tertiary)" }}>
          Выберите до 3 ключей — они помогут найти близкого по духу человека
        </p>
      )}
      {groups.map((group, gi) => {
        const groupLimit = gi === 1 ? QUALITY_GROUP_LIMIT : TOTAL_LIMIT;
        const groupSelected = checked.filter((k) => group.items.includes(k)).length;

        return (
          <div key={group.title} className="corens-stack corens-gap-xs">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong className="corens-card-title">{group.title}</strong>
              <span className="corens-eyebrow">
                {groupSelected}/{groupLimit}
              </span>
            </div>
            <div className="corens-chip-row">
              {group.items.map((item) => {
                const active = checked.includes(item);
                const disabled = isDisabled(item, group.title);

                return (
                  <label
                    key={item}
                    className="corens-chip-checkbox"
                    style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" }}
                  >
                    <input
                      type="checkbox"
                      name="trustKeys"
                      value={item}
                      checked={active}
                      disabled={disabled}
                      onChange={() => toggle(item, group.title)}
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
  );
}
