"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
        safeAreaInset?: { top: number; bottom: number; left: number; right: number };
        onEvent?: (event: string, callback: () => void) => void;
      };
    };
  }
}

/**
 * Reads Telegram.WebApp.contentSafeAreaInset (available since Bot API 7.7) and
 * sets --tg-content-safe-area-inset-top on the document root so the TopBar can
 * push its content below Telegram's fullscreen overlay buttons.
 *
 * Falls back to safeAreaInset.top if contentSafeAreaInset is unavailable.
 * Newer Telegram versions set the CSS variable themselves; this component only
 * writes a value when the JS API reports a non-zero top inset.
 */
export function TelegramSafeArea() {
  useEffect(() => {
    function apply() {
      const tg = window.Telegram?.WebApp;
      if (!tg) return;

      const top =
        tg.contentSafeAreaInset?.top ??
        tg.safeAreaInset?.top ??
        0;

      if (top > 0) {
        document.documentElement.style.setProperty(
          "--tg-content-safe-area-inset-top",
          `${top}px`
        );
      }
    }

    // Run immediately and again after a short delay
    // (Telegram WebApp may not be fully initialised on first tick)
    apply();
    const t = setTimeout(apply, 300);

    // Re-apply if Telegram fires a viewport-change event
    window.Telegram?.WebApp?.onEvent?.("viewportChanged", apply);

    return () => clearTimeout(t);
  }, []);

  return null;
}
