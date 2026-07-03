"use client";

import { useEffect, useState } from "react";
import { AtSign, CheckCircle2, MessagesSquare, Sparkles, XCircle } from "lucide-react";
import { ListPanel, ListRow } from "@/components/layout/Page";
import type { NotificationItem } from "@/lib/notifications";
import { timeAgo, cn } from "@/lib/utils";

const POLL_MS = 5000;

function NotificationIcon({ kind, status }: { kind: NotificationItem["kind"]; status: string }) {
  if (kind === "mention")
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
        <AtSign className="size-4" />
      </span>
    );
  if (kind === "forum_reply")
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-soft text-sky">
        <MessagesSquare className="size-4" />
      </span>
    );
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md",
        status === "COMPLETED"
          ? "bg-mint-soft text-mint"
          : status === "FAILED"
            ? "bg-blush-soft text-blush"
            : "bg-brand-50 text-brand-700"
      )}
    >
      {status === "COMPLETED" ? (
        <CheckCircle2 className="size-4" />
      ) : status === "FAILED" ? (
        <XCircle className="size-4" />
      ) : (
        <Sparkles className="size-4" />
      )}
    </span>
  );
}

export function NotificationsList({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch("/api/notifications?take=15", { cache: "no-store" });
        if (res.ok && !stop) {
          const data = (await res.json()) as { notifications: NotificationItem[] };
          setNotifications(data.notifications);
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!stop) timer = setTimeout(poll, POLL_MS);
      }
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <ListPanel className="mt-6">
      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      ) : (
        notifications.map((n) => (
          <ListRow
            key={n.id}
            href={n.href ?? undefined}
            className={cn(n.unread && "bg-brand-50/40")}
          >
            <NotificationIcon kind={n.kind} status={n.status} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{n.message}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(n.updatedAt)}</p>
            </div>
          </ListRow>
        ))
      )}
    </ListPanel>
  );
}
