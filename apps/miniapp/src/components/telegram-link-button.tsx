"use client";

import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "beacon" | "success";
};

type TelegramWebApp = {
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: TelegramWebApp };
};

const buttonVariantClassName: Record<NonNullable<Props["variant"]>, string> = {
  primary: "corens-button corens-button-primary",
  secondary: "corens-button corens-button-secondary",
  ghost: "corens-button corens-button-ghost",
  danger: "corens-button corens-button-danger",
  beacon: "corens-button corens-button-beacon",
  success: "corens-button corens-button-success"
};

function cn(...parts: Array<string | null | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function TelegramLinkButton({
  href,
  children,
  className,
  variant = "primary"
}: Props) {
  function handleClick() {
    const tg = (window as TelegramWindow).Telegram?.WebApp;

    try {
      tg?.openTelegramLink?.(href);
      return;
    } catch {
      // Fallbacks below handle clients where openTelegramLink rejects this URL shape.
    }

    try {
      tg?.openLink?.(href);
      return;
    } catch {
      // Final fallback to browser navigation keeps non-Telegram environments working.
    }

    window.location.href = href;
  }

  return (
    <button
      type="button"
      className={cn(buttonVariantClassName[variant], className)}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
