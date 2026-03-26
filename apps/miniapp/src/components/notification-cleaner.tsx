"use client";

import { useEffect } from "react";

import { cleanupBotNotificationsAction } from "../app/actions";

export function NotificationCleaner() {
  useEffect(() => {
    cleanupBotNotificationsAction().catch(() => {});
  }, []);

  return null;
}
