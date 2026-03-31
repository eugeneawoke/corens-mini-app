"use client";

import { useCallback } from "react";
import { BeaconButton } from "./beacon-button";

type Props = {
  isCooldown: boolean;
};

export function BeaconActivateForm({ isCooldown }: Props) {
  const scrollToCooldown = useCallback(() => {
    const target = document.getElementById("beacon-cooldown-card");

    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth"
    });
  }, []);

  return (
    <div className="corens-stack corens-gap-sm">
      <div className="corens-field-wrap">
        <label className="corens-field-label" htmlFor="beacon-duration">
          Время маяка
        </label>
        <select
          id="beacon-duration"
          name="durationMinutes"
          className="corens-field"
          disabled={isCooldown}
        >
          <option value="15">15 минут</option>
          <option value="30">30 минут</option>
          <option value="45">45 минут</option>
          <option value="60">1 час</option>
        </select>
      </div>

      {isCooldown ? (
        <button
          type="button"
          className="corens-button corens-button-beacon corens-button-disabled-look"
          aria-disabled="true"
          onClick={scrollToCooldown}
        >
          Зажечь маяк
        </button>
      ) : (
        <BeaconButton kind="activate" />
      )}
    </div>
  );
}
