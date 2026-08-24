type TelegramWebApp = {
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: TelegramWebApp };
};

export function openTelegramLink(href: string, browserWindow: TelegramWindow = window): void {
  const tg = browserWindow.Telegram?.WebApp;

  if (tg?.openTelegramLink) {
    try {
      tg.openTelegramLink(href);
      return;
    } catch {
      // Fallbacks below handle clients where openTelegramLink rejects this URL shape.
    }
  }

  if (tg?.openLink) {
    try {
      tg.openLink(href);
      return;
    } catch {
      // Final fallback to browser navigation keeps non-Telegram environments working.
    }
  }

  browserWindow.location.href = href;
}

export function startContactHandoff(
  connectionId: string,
  track: (connectionId: string) => Promise<void>,
  openTelegram: () => void
): void {
  void track(connectionId).catch(() => undefined);
  openTelegram();
}
