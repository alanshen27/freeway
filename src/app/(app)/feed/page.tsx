import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { timeAgo, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Page, PageTitle, ListPanel, ListRow } from "@/components/layout/Page";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");
  const courses = await prisma.course.findMany({
    where: { ownerId: user.id },
    include: { _count: { select: { threads: true } } },
    orderBy: { createdAt: "desc" },
  });
  const threads = await prisma.forumThread.findMany({
    where: { course: { ownerId: user.id } },
    include: { author: true, course: true, _count: { select: { posts: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <Page>
      <PageTitle
        title="Feed"
        description="Course discussions and help threads"
      />

      {courses.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Course forums
          </p>
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/feed/${c.id}`}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                {c.title}
                <span className="text-xs text-muted-foreground">
                  {c._count.threads}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent discussions
        </p>
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No discussions yet. Open a course forum to start one.
          </p>
        ) : (
          <ListPanel>
            {threads.map((t) => (
              <ListRow key={t.id} href={`/feed/${t.courseId}/thread/${t.id}`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-medium text-brand-700">
                  {initials(t.author.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t.author.name} · {timeAgo(t.createdAt)}
                    </span>
                    <Badge variant="outline">{t.course.title}</Badge>
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
            ))}
          </ListPanel>
        )}
      </div>
    </Page>
  );
}
