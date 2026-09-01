"use client";

import { useEffect } from "react";
import { cleanupBotNotificationsAction } from "../app/actions";

export function NotificationCleanup({
  notificationId
}: {
  notificationId: string | undefined;
}) {
  useEffect(() => {
    if (notificationId) {
      void cleanupBotNotificationsAction(notificationId);
    }
  }, [notificationId]);

  return null;
}
