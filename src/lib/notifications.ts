import { prisma } from "@/lib/prisma";
import { viewerCourseIdForTrack } from "@/lib/forum";

export type NotificationItem = {
  id: string;
  kind: "generation" | "forum_reply" | "mention";
  /** Generation: job status. Reply/mention: a fixed tag. */
  status: string;
  message: string;
  /** Where clicking the notification should take the user. */
  href: string | null;
  updatedAt: string;
  unread: boolean;
};

function messageFor(status: string, courseTitle: string) {
  if (status === "COMPLETED") return `"${courseTitle}" is ready`;
  if (status === "FAILED") return `Generation failed for "${courseTitle}"`;
  return `Building "${courseTitle}"…`;
}

/**
 * Latest notifications for a user: course generation updates, replies on
 * threads they started, and @mentions of them anywhere in the shared forum.
 */
export async function getNotifications(
  userId: string,
  seenAt: Date | null,
  take = 8
): Promise<NotificationItem[]> {
  const [jobs, replies, threadMentions, postMentions] = await Promise.all([
    prisma.generationJob.findMany({
      where: { userId },
      include: { course: true },
      orderBy: { updatedAt: "desc" },
      take,
    }),
    prisma.forumPost.findMany({
      // Replies from other people on discussions this user started — but if they
      // were @mentioned in that reply, the mention notification covers it.
      where: {
        authorId: { not: userId },
        thread: { authorId: userId },
        NOT: { mentionedUserIds: { has: userId } },
      },
      include: { thread: true, author: true },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.forumThread.findMany({
      where: { mentionedUserIds: { has: userId }, authorId: { not: userId } },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.forumPost.findMany({
      where: { mentionedUserIds: { has: userId }, authorId: { not: userId } },
      include: { thread: true, author: true },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);

  const jobItems: NotificationItem[] = jobs.map((j) => {
    const courseTitle = j.course?.title ?? "Course";
    return {
      id: `job:${j.id}`,
      kind: "generation",
      status: j.status,
      message: messageFor(j.status, courseTitle),
      href: j.courseId ? `/courses/${j.courseId}` : null,
      updatedAt: j.updatedAt.toISOString(),
      unread: !seenAt || j.updatedAt > seenAt,
    };
  });

  const replyItems: NotificationItem[] = replies.map((p) => ({
    id: `reply:${p.id}`,
    kind: "forum_reply",
    status: "REPLY",
    message: p.isAI
      ? `AI Tutor replied in "${p.thread.title}"`
      : `${p.author.name} replied in "${p.thread.title}"`,
    href: `/feed/${p.thread.courseId}/thread/${p.thread.id}`,
    updatedAt: p.createdAt.toISOString(),
    unread: !seenAt || p.createdAt > seenAt,
  }));

  // Mentions can happen on anyone's thread, so the link must use the
  // mentioned (viewing) user's OWN course on that track, not the author's.
  const trackSlugs = new Set<string>();
  for (const t of threadMentions) trackSlugs.add(t.trackSlug);
  for (const p of postMentions) trackSlugs.add(p.thread.trackSlug);
  const courseIdByTrack = new Map<string, string | null>();
  await Promise.all(
    [...trackSlugs].map(async (slug) => {
      courseIdByTrack.set(slug, await viewerCourseIdForTrack(userId, slug));
    })
  );

  const threadMentionItems: NotificationItem[] = threadMentions.map((t) => {
    const courseId = courseIdByTrack.get(t.trackSlug) ?? null;
    const ts = t.editedAt ?? t.createdAt;
    return {
      id: `mention-thread:${t.id}`,
      kind: "mention",
      status: "MENTION",
      message: `${t.author.name} mentioned you in "${t.title}"`,
      href: courseId ? `/feed/${courseId}/thread/${t.id}` : null,
      updatedAt: ts.toISOString(),
      unread: !seenAt || ts > seenAt,
    };
  });

  const postMentionItems: NotificationItem[] = postMentions.map((p) => {
    const courseId = courseIdByTrack.get(p.thread.trackSlug) ?? null;
    const ts = p.editedAt ?? p.createdAt;
    return {
      id: `mention-post:${p.id}`,
      kind: "mention",
      status: "MENTION",
      message: `${p.author.name} mentioned you in "${p.thread.title}"`,
      href: courseId ? `/feed/${courseId}/thread/${p.threadId}` : null,
      updatedAt: ts.toISOString(),
      unread: !seenAt || ts > seenAt,
    };
  });

  return [...jobItems, ...replyItems, ...threadMentionItems, ...postMentionItems]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, take);
}

/** Cheap existence check for the unread dot — avoids loading the full list. */
export async function hasUnreadNotifications(userId: string, seenAt: Date | null) {
  const recentFilter = seenAt
    ? { OR: [{ createdAt: { gt: seenAt } }, { editedAt: { gt: seenAt } }] }
    : {};

  const [job, reply, threadMention, postMention] = await Promise.all([
    prisma.generationJob.findFirst({
      where: { userId, ...(seenAt ? { updatedAt: { gt: seenAt } } : {}) },
      select: { id: true },
    }),
    prisma.forumPost.findFirst({
      where: {
        authorId: { not: userId },
        thread: { authorId: userId },
        NOT: { mentionedUserIds: { has: userId } },
        ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
      },
      select: { id: true },
    }),
    prisma.forumThread.findFirst({
      where: { mentionedUserIds: { has: userId }, authorId: { not: userId }, ...recentFilter },
      select: { id: true },
    }),
    prisma.forumPost.findFirst({
      where: { mentionedUserIds: { has: userId }, authorId: { not: userId }, ...recentFilter },
      select: { id: true },
    }),
  ]);
  return !!job || !!reply || !!threadMention || !!postMention;
}

/** Advance the read watermark — never moves it backward. */
export async function markNotificationsSeen(userId: string, at: Date = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationsSeenAt: true },
  });
  const next =
    !user?.notificationsSeenAt || at > user.notificationsSeenAt
      ? at
      : user.notificationsSeenAt;
  if (next === user?.notificationsSeenAt) {
    return next;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { notificationsSeenAt: next },
  });
  return next;
}
