"use client";

import { useFormStatus } from "react-dom";

interface BeaconButtonProps {
  kind: "activate" | "deactivate";
}

export function BeaconButton({ kind }: BeaconButtonProps) {
  const { pending } = useFormStatus();

  const label = kind === "activate"
    ? (pending ? "Зажигаем…" : "Зажечь маяк")
    : (pending ? "Тушим…" : "Потушить маяк");

  const animClass = pending
    ? kind === "activate"
      ? " corens-beacon-btn-activating"
      : " corens-beacon-btn-deactivating"
    : "";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`corens-button corens-button-beacon${animClass}`}
    >
      {label}
    </button>
  );
}
