import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { userHasForumAccess } from "@/lib/forum";
import { PageHeader } from "@/components/PageHeader";
import { Page, ContentBlock, ListPanel } from "@/components/layout/Page";
import { ThreadPost } from "./ThreadPost";
import { ReplyItem } from "./ReplyItem";
import { ReplyBox } from "./ReplyBox";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ courseId: string; threadId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");

  const { courseId, threadId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, ownerId: true, trackSlug: true },
  });
  if (!course || course.ownerId !== user.id) notFound();

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: {
      author: true,
      exercise: { include: { lesson: true } },
      posts: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread || thread.trackSlug !== course.trackSlug) notFound();
  if (!(await userHasForumAccess(user.id, thread.trackSlug))) notFound();

  const canLinkExercise =
    thread.exercise &&
    (thread.authorId === user.id || thread.exercise.courseId === courseId);

  return (
    <div>
      <PageHeader
        title={thread.title}
        eyebrow="Discussion"
        backHref={`/feed/${courseId}`}
      />
      <Page>
        <ContentBlock>
          <ThreadPost
            courseId={courseId}
            isAuthor={thread.authorId === user.id}
            thread={{
              id: thread.id,
              title: thread.title,
              body: thread.body,
              createdAt: thread.createdAt.toISOString(),
              editedAt: thread.editedAt?.toISOString() ?? null,
              author: { name: thread.author.name },
            }}
          />
          {thread.exercise &&
            (canLinkExercise ? (
              <Link
                href={
                  thread.exercise.lessonId
                    ? `/lessons/${thread.exercise.lessonId}`
                    : `/courses/${courseId}`
                }
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
              >
                <Paperclip className="size-4" />
                {thread.exercise.title}
              </Link>
            ) : (
              <span className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                <Paperclip className="size-4" />
                {thread.exercise.title}
              </span>
            ))}
        </ContentBlock>

        {thread.posts.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Replies ({thread.posts.length})
            </p>
            <ListPanel>
              {thread.posts.map((p) => (
                <ReplyItem
                  key={p.id}
                  threadId={thread.id}
                  isAuthor={p.authorId === user.id}
                  post={{
                    id: p.id,
                    body: p.body,
                    isAI: p.isAI,
                    createdAt: p.createdAt.toISOString(),
                    editedAt: p.editedAt?.toISOString() ?? null,
                    author: { name: p.author.name },
                  }}
                />
              ))}
            </ListPanel>
          </div>
        )}

        <ReplyBox threadId={thread.id} />
      </Page>
    </div>
  );
}
