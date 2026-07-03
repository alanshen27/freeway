import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { trackTitle, viewerCourseIdForTrack } from "@/lib/forum";
import { timeAgo, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Page, PageTitle, ListPanel, ListRow } from "@/components/layout/Page";

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

  const courseIdByTrack = new Map(
    await Promise.all(
      trackSlugs.map(async (trackSlug) => [
        trackSlug,
        await viewerCourseIdForTrack(user.id, trackSlug),
      ] as const)
    )
  );

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
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No discussions yet. Open a course forum to start one.
          </p>
        ) : (
          <ListPanel>
            {threads.map((t) => {
              const courseId = courseIdByTrack.get(t.trackSlug);
              if (!courseId) return null;
              return (
                <ListRow key={t.id} href={`/feed/${courseId}/thread/${t.id}`}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-medium text-brand-700">
                    {initials(t.author.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t.author.name} · {timeAgo(t.createdAt)}
                      </span>
                      <Badge variant="outline">{trackTitle(t.trackSlug)}</Badge>
                    </div>
                    <h3 className="mt-0.5 text-sm font-medium">{t.title}</h3>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {t.body}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessagesSquare className="size-3" /> {t._count.posts} replies
                    </span>
                  </div>
                </ListRow>
              );
            })}
          </ListPanel>
        )}
      </div>
    </Page>
  );
}
