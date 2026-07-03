import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { trackTitle } from "@/lib/forum";
import { shapeForumAuthor } from "@/lib/forum-types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/layout/Page";
import { FeedThreadList } from "@/components/forum/FeedThreadList";

export const dynamic = "force-dynamic";

export default async function CourseForumPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, trackSlug: true, ownerId: true },
  });
  if (!course || course.ownerId !== user.id) notFound();

  const threads = await prisma.forumThread.findMany({
    where: { trackSlug: course.trackSlug },
    include: { author: true, exercise: true, _count: { select: { posts: true } } },
    orderBy: { createdAt: "desc" },
  });

  const initialThreads = threads.map((t) => ({
    id: t.id,
    trackSlug: t.trackSlug,
    authorId: t.authorId,
    title: t.title,
    body: t.body,
    createdAt: t.createdAt.toISOString(),
    replyCount: t._count.posts,
    author: shapeForumAuthor(t.author),
    exerciseRef: !!t.exercise,
  }));

  return (
    <div>
      <PageHeader
        title={trackTitle(course.trackSlug)}
        eyebrow="Forum"
        backHref="/feed"
        action={
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={`/feed/${courseId}/new`}>
              <Plus className="size-4" />
              New
            </Link>
          </Button>
        }
      />
      <Page>
        <p className={"text-sm text-muted-foreground " + (threads.length === 0 ? "text-center" : "text-left")}>
          Shared with everyone taking {trackTitle(course.trackSlug)}.
        </p>
        <Button asChild size="sm" className="mb-4 mt-4 sm:hidden">
          <Link href={`/feed/${courseId}/new`}>
            <Plus className="size-4" />
            New discussion
          </Link>
        </Button>

        <div className="mt-6">
          <FeedThreadList
            initialThreads={initialThreads}
            courseId={courseId}
            userId={user.id}
            trackSlug={course.trackSlug}
            showChevron
            emptyMessage="No discussions yet. Start the first thread for this track."
          />
        </div>
      </Page>
    </div>
  );
}
