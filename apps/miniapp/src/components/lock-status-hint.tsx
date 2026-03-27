"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";

interface LockStatusHintProps {
  anyConsentApproved: boolean;
}

export function LockStatusHint({ anyConsentApproved }: LockStatusHintProps) {
  const [showHint, setShowHint] = useState(false);

  // Close hint on any tap / scroll outside (or on the hint itself)
  useEffect(() => {
    if (!showHint) return;
    const close = () => setShowHint(false);
    // Defer so the opening click doesn't immediately re-close
    const timer = setTimeout(() => {
      document.addEventListener("click", close, { once: true });
      document.addEventListener("touchmove", close, { once: true, passive: true } as AddEventListenerOptions);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", close);
      document.removeEventListener("touchmove", close);
    };
  }, [showHint]);

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
              : "Способ связаться откроется, когда оба дадут согласие"}
          </p>
        </div>
      )}
    </div>
  );
}
