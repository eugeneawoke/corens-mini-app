"use client";

import { useEffect } from "react";
import { cleanupBotNotificationsAction } from "../app/actions";

export function NotificationCleanup() {
  useEffect(() => {
    void cleanupBotNotificationsAction();
  }, []);

  return null;
}
