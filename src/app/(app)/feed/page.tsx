import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { trackTitle, viewerCourseIdForTrack } from "@/lib/forum";
import { shapeForumAuthor } from "@/lib/forum-types";
import { Page, PageTitle } from "@/components/layout/Page";
import { FeedThreadList } from "@/components/forum/FeedThreadList";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");

  const courses = await prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const trackSlugs = [...new Set(courses.map((c) => c.trackSlug))];
  const threadCounts = trackSlugs.length
    ? await prisma.forumThread.groupBy({
        by: ["trackSlug"],
        where: { trackSlug: { in: trackSlugs } },
        _count: { _all: true },
      })
    : [];
  const countByTrack = new Map(
    threadCounts.map((row) => [row.trackSlug, row._count._all])
  );

  const forumCourses = courses.filter(
    (c, i, arr) => arr.findIndex((x) => x.trackSlug === c.trackSlug) === i
  );

  const threads = trackSlugs.length
    ? await prisma.forumThread.findMany({
        where: { trackSlug: { in: trackSlugs } },
        include: { author: true, _count: { select: { posts: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const courseIdByTrack = Object.fromEntries(
    await Promise.all(
      trackSlugs.map(async (trackSlug) => [
        trackSlug,
        await viewerCourseIdForTrack(user.id, trackSlug),
      ] as const)
    )
  );

  const initialThreads = threads.map((t) => ({
    id: t.id,
    trackSlug: t.trackSlug,
    authorId: t.authorId,
    title: t.title,
    body: t.body,
    createdAt: t.createdAt.toISOString(),
    replyCount: t._count.posts,
    author: shapeForumAuthor(t.author),
  }));

  return (
    <Page>
      <PageTitle
        eyebrow="Community"
        title="Feed"
        description="Discussions shared with everyone on the same course track"
      />

      {forumCourses.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-foreground">
            Course forums
          </p>
          <div className="flex flex-wrap gap-2">
            {forumCourses.map((c) => (
              <Link
                key={c.trackSlug}
                href={`/feed/${c.id}`}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                {trackTitle(c.trackSlug)}
                <span className="text-xs text-muted-foreground">
                  {countByTrack.get(c.trackSlug) ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="mb-3 text-sm font-semibold text-foreground">
          Recent discussions
        </p>
        <FeedThreadList
          initialThreads={initialThreads}
          courseIdByTrack={courseIdByTrack}
          userId={user.id}
          showTrackBadge
          emptyMessage="No discussions yet. Open a course forum to start one."
        />
      </div>
    </Page>
  );
}
