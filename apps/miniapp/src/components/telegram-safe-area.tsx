"use client";

import { useEffect } from "react";

// Local type — avoids conflicting with auth-bootstrap.tsx's Window.Telegram declaration
type TelegramWebApp = {
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  onEvent?: (event: string, callback: () => void) => void;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: TelegramWebApp };
};

/**
 * Reads Telegram.WebApp.contentSafeAreaInset (Bot API 7.7+) and sets
 * --tg-content-safe-area-inset-top on the root element so the TopBar sits
 * below Telegram's fullscreen overlay buttons.
 */
export function TelegramSafeArea() {
  useEffect(() => {
    function apply() {
      const tg = (window as TelegramWindow).Telegram?.WebApp;
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

    apply();
    const t = setTimeout(apply, 300);
    (window as TelegramWindow).Telegram?.WebApp?.onEvent?.("viewportChanged", apply);
    return () => clearTimeout(t);
  }, []);

  return null;
}
