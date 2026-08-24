"use client";

import type { ReactNode } from "react";
import { recordContactOpenedAction } from "../app/actions";
import { openTelegramLink, startContactHandoff } from "../lib/contact-handoff";
import { TelegramLinkButton } from "./telegram-link-button";

type Props = {
  connectionId: string;
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "beacon" | "success";
};

export function ContactHandoffButton({
  connectionId,
  href,
  children,
  variant = "primary"
}: Props) {
  return (
    <TelegramLinkButton
      href={href}
      variant={variant}
      onClick={() =>
        startContactHandoff(connectionId, recordContactOpenedAction, () => openTelegramLink(href))
      }
    >
      {children}
    </TelegramLinkButton>
  );
}
