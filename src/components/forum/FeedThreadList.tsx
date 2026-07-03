"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { ListPanel, ListRow } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { DeleteThreadButton } from "@/components/forum/DeleteThreadButton";
import { trackTitle } from "@/lib/track-labels";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo } from "@/lib/utils";
import type { ForumAuthorPublic } from "@/lib/forum-types";

export type FeedThreadItem = {
  id: string;
  trackSlug: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  replyCount: number;
  author: ForumAuthorPublic;
  exerciseRef?: boolean;
};

const POLL_MS = 5000;

export function FeedThreadList({
  initialThreads,
  courseId,
  courseIdByTrack,
  userId,
  trackSlug,
  showTrackBadge = false,
  showChevron = false,
  emptyMessage,
}: {
  initialThreads: FeedThreadItem[];
  /** Fixed course for single-forum pages. */
  courseId?: string;
  /** Maps track slug → viewer course id (global feed). */
  courseIdByTrack?: Record<string, string | null | undefined>;
  userId: string;
  /** When set, poll this track only. */
  trackSlug?: string;
  showTrackBadge?: boolean;
  showChevron?: boolean;
  emptyMessage: string;
}) {
  const [threads, setThreads] = useState(initialThreads);

  useEffect(() => {
    setThreads(initialThreads);
  }, [initialThreads]);

  const removeThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
  }, []);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ take: "20" });
        if (trackSlug) qs.set("trackSlug", trackSlug);
        const res = await fetch(`/api/forum/threads?${qs}`, { cache: "no-store" });
        if (res.ok && !stop) {
          const data = (await res.json()) as { threads: FeedThreadItem[] };
          setThreads(data.threads);
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
  }, [trackSlug]);

  function hrefFor(t: FeedThreadItem) {
    const cid = courseId ?? courseIdByTrack?.[t.trackSlug];
    return cid ? `/feed/${cid}/thread/${t.id}` : null;
  }

  if (threads.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ListPanel>
      {threads.map((t) => {
        const href = hrefFor(t);
        if (!href) return null;
        return (
          <ListRow key={t.id} href={href}>
            <UserAvatar name={t.author.name} avatarUrl={t.author.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t.author.name} · {timeAgo(t.createdAt)}
                </span>
                {showTrackBadge && (
                  <Badge variant="outline">{trackTitle(t.trackSlug)}</Badge>
                )}
                {t.exerciseRef && <Badge variant="outline">Exercise ref</Badge>}
              </div>
              <h3 className="mt-0.5 text-sm font-medium">{t.title}</h3>
              <p className="line-clamp-1 text-sm text-muted-foreground">{t.body}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessagesSquare className="size-3" /> {t.replyCount} replies
              </span>
            </div>
            {t.authorId === userId && (
              <DeleteThreadButton threadId={t.id} onDeleted={() => removeThread(t.id)} />
            )}
            {showChevron && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
          </ListRow>
        );
      })}
    </ListPanel>
  );
}
