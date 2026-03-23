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

// Per-group limits: group[0] max 3, group[1] max 2
const GROUP_LIMITS = [3, 2];

export function TrustKeysSelector({ groups, selected, showHint = false }: Props) {
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

  function isDisabled(item: string): boolean {
    if (checked.includes(item)) return false;
    const gi = getGroupIndex(item);
    const limit = GROUP_LIMITS[gi] ?? 3;
    return countForGroup(gi) >= limit;
  }

  return (
    <div className="corens-stack corens-gap-sm">
      {showHint && (
        <p style={{ margin: 0, fontSize: "13px", color: "var(--corens-text-tertiary)", lineHeight: 1.4 }}>
          Выберите ключи в каждой группе — они помогут найти близкого человека
        </p>
      )}
      {groups.map((group, gi) => {
        const limit = GROUP_LIMITS[gi] ?? 3;
        const groupCount = countForGroup(gi);

        return (
          <div key={group.title} className="corens-stack corens-gap-xs">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong className="corens-card-title">{group.title}</strong>
              <span className="corens-eyebrow">
                {groupCount}/{limit}
              </span>
            </div>
            <div className="corens-chip-row">
              {group.items.map((item) => {
                const active = checked.includes(item);
                const disabled = isDisabled(item);

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
  );
}
