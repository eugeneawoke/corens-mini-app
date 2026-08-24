"use client";

import type { ReactNode } from "react";
import { openTelegramLink } from "../lib/contact-handoff";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "beacon" | "success";
  onClick?: () => void;
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
  variant = "primary",
  onClick
}: Props) {
  function handleClick() {
    openTelegramLink(href);
  }

  return (
    <button
      type="button"
      className={cn(buttonVariantClassName[variant], className)}
      onClick={onClick ?? handleClick}
    >
      {children}
    </button>
  );
}
