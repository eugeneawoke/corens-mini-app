"use client";

import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";

interface LockStatusHintProps {
  anyConsentApproved: boolean;
}

export function LockStatusHint({ anyConsentApproved }: LockStatusHintProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="corens-lock-hint-wrapper">
      <button
        type="button"
        className={`corens-status-lock${anyConsentApproved ? " corens-status-lock-open" : ""}`}
        onClick={() => setShowHint((v) => !v)}
        aria-label={anyConsentApproved ? "Один шаг уже сделан" : "Информация о приватности"}
      >
        {anyConsentApproved ? <CheckCircle2 size={28} /> : <Lock size={28} />}
      </button>
      {showHint && (
        <div className="corens-lock-hint" role="tooltip">
          <p className="corens-lock-hint-text">
            {anyConsentApproved
              ? "Один из шагов уже пройден — продолжайте"
              : "Фото и контакт откроются, когда оба дадут согласие"}
          </p>
          <button
            type="button"
            className="corens-lock-hint-close"
            onClick={() => setShowHint(false)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
