"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AtSign, Bell, CheckCircle2, MessagesSquare, Sparkles, XCircle, Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationItem } from "@/lib/notifications";
import { dispatchNotificationsRead } from "@/lib/notifications-events";
import { useNotificationsReadListener } from "@/components/forum/MarkForumThreadRead";

const POLL_MS = 5000;

function StatusIcon({ kind, status }: { kind: NotificationItem["kind"]; status: string }) {
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
  if (status === "COMPLETED")
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-soft text-mint">
        <CheckCircle2 className="size-4" />
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blush-soft text-blush">
        <XCircle className="size-4" />
      </span>
    );
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
      <Sparkles className="size-4" />
    </span>
  );
}

export function NotificationsMenu({
  initialHasUnread = false,
}: {
  initialHasUnread?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(initialHasUnread);

  useNotificationsReadListener(useCallback(() => setHasUnread(false), []));

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (stop) return;
      try {
        if (open) {
          const res = await fetch("/api/notifications", { cache: "no-store" });
          if (res.ok && !stop) {
            const data = (await res.json()) as { notifications: NotificationItem[] };
            setItems(data.notifications);
            setHasUnread(data.notifications.some((n) => n.unread));
          }
        } else {
          const res = await fetch("/api/notifications/unread", { cache: "no-store" });
          if (res.ok && !stop) {
            const data = (await res.json()) as { hasUnread: boolean };
            setHasUnread(data.hasUnread);
          }
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
  }, [open]);

  async function markRead(at?: string) {
    setHasUnread(false);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(at ? { at } : {}),
    }).catch(() => {});
    dispatchNotificationsRead();
  }

  async function loadAndMarkRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { notifications: NotificationItem[] };
        setItems(data.notifications);
      }
    } finally {
      setLoading(false);
    }
    await markRead();
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadAndMarkRead();
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Bell className="size-[18px]" />
          {hasUnread && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const row = (
                  <>
                    <StatusIcon kind={n.kind} status={n.status} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-foreground">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {timeAgo(n.updatedAt)}
                      </p>
                    </div>
                    {n.unread && (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </>
                );
                const rowClassName = cn(
                  "flex items-start gap-3 px-4 py-3",
                  n.unread && "bg-brand-50/40"
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          setOpen(false);
                          void markRead(n.updatedAt);
                        }}
                        className={cn(rowClassName, "transition-colors hover:bg-secondary/60")}
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className={rowClassName}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
