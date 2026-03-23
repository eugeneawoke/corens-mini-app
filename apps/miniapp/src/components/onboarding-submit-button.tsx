"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function OnboardingSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <div className="corens-stack corens-gap-sm">
      <button
        type="submit"
        disabled={pending}
        className="corens-button corens-button-primary"
        style={{ gap: "8px" }}
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
