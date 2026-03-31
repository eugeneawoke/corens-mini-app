"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatCountdown(target: Date): string {
  const diffMs = Math.max(target.getTime() - Date.now(), 0);
  if (diffMs === 0) return "00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type Props = {
  targetAt?: string;
  fallbackLabel: string;
  variant?: "default" | "emphasized" | "inline";
};

export function BeaconCountdown({ targetAt, fallbackLabel, variant = "default" }: Props) {
  const router = useRouter();
  const [label, setLabel] = useState(
    targetAt ? formatCountdown(new Date(targetAt)) : fallbackLabel
  );

  useEffect(() => {
    if (!targetAt) {
      setLabel(fallbackLabel);
      return;
    }

    const target = new Date(targetAt);
    const targetAtMs = target.getTime();
    let didRefresh = false;

    const tick = () => {
      const nextLabel = formatCountdown(target);
      setLabel(nextLabel);

      if (!didRefresh && Date.now() >= targetAtMs) {
        didRefresh = true;
        router.refresh();
      }
    };

    tick();
    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [targetAt, fallbackLabel, router]);

  return (
    <span
      className={`corens-eyebrow corens-mono corens-beacon-timer${
        variant === "emphasized"
          ? " corens-beacon-timer-emphasized"
          : variant === "inline"
            ? " corens-beacon-timer-inline"
            : ""
      }`}
    >
      {label}
    </span>
  );
}
