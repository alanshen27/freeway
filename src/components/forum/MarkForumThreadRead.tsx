"use client";

import { useEffect } from "react";
import {
  dispatchNotificationsRead,
  NOTIFICATIONS_READ_EVENT,
} from "@/lib/notifications-events";

/** Marks forum reply notifications read when the thread author views the discussion. */
export function MarkForumThreadRead({
  seenAt,
  enabled,
}: {
  seenAt: string;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ at: seenAt }),
    })
      .then(() => dispatchNotificationsRead())
      .catch(() => {});
  }, [seenAt, enabled]);

  return null;
}

export function useNotificationsReadListener(onRead: () => void) {
  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    return () => window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
  }, [onRead]);
}
