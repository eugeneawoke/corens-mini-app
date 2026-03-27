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
  expiresAt?: string;
  fallbackLabel: string;
};

export function BeaconCountdown({ expiresAt, fallbackLabel }: Props) {
  const router = useRouter();
  const [label, setLabel] = useState(
    expiresAt ? formatCountdown(new Date(expiresAt)) : fallbackLabel
  );

  useEffect(() => {
    if (!expiresAt) {
      setLabel(fallbackLabel);
      return;
    }

    const target = new Date(expiresAt);
    const expiresAtMs = target.getTime();
    let didRefresh = false;

    const tick = () => {
      const nextLabel = formatCountdown(target);
      setLabel(nextLabel);

      if (!didRefresh && Date.now() >= expiresAtMs) {
        didRefresh = true;
        router.refresh();
      }
    };

    tick();
    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, fallbackLabel, router]);

  return (
    <span
      className="corens-eyebrow corens-mono"
      style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "0.04em", color: "var(--corens-beacon)" }}
    >
      {label}
    </span>
  );
}
