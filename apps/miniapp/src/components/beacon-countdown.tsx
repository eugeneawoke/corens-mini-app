"use client";

import { useEffect, useState } from "react";

function formatCountdown(target: Date): string {
  const diffMs = Math.max(target.getTime() - Date.now(), 0);
  if (diffMs === 0) return "00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type Props = {
  expiresAt?: string;
  fallbackLabel: string;
};

export function BeaconCountdown({ expiresAt, fallbackLabel }: Props) {
  const [label, setLabel] = useState(
    expiresAt ? formatCountdown(new Date(expiresAt)) : fallbackLabel
  );

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt);
    setLabel(formatCountdown(target));
    const interval = setInterval(() => {
      setLabel(formatCountdown(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span
      className="corens-eyebrow corens-mono"
      style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "0.04em", color: "var(--corens-beacon)" }}
    >
      {label}
    </span>
  );
}
