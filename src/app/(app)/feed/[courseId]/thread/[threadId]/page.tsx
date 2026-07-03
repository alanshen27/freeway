import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { userHasForumAccess, getTrackParticipants } from "@/lib/forum";
import { shapeForumPromptPosts, latestForumActivityAt } from "@/lib/forum-thread-posts";
import { shapeForumAuthor } from "@/lib/forum-types";
import { PageHeader } from "@/components/PageHeader";
import { Page, ContentBlock } from "@/components/layout/Page";
import { MarkForumThreadRead } from "@/components/forum/MarkForumThreadRead";
import { ThreadPost } from "./ThreadPost";
import { ThreadDiscussion } from "./ThreadDiscussion";

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
      posts: {
        include: { author: true, aiReply: { include: { author: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!thread || thread.trackSlug !== course.trackSlug) notFound();
  if (!(await userHasForumAccess(user.id, thread.trackSlug))) notFound();

  const mentionables = await getTrackParticipants(thread.trackSlug, user.id);

  const canLinkExercise =
    thread.exercise &&
    (thread.authorId === user.id || thread.exercise.courseId === courseId);

  const promptPosts = shapeForumPromptPosts(thread, thread.posts, user.id);
  const activityAt = latestForumActivityAt(thread, thread.posts);

  return (
    <div>
      <MarkForumThreadRead
        seenAt={activityAt.toISOString()}
        enabled={thread.authorId === user.id}
      />
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
            mentionables={mentionables}
            thread={{
              id: thread.id,
              title: thread.title,
              body: thread.body,
              createdAt: thread.createdAt.toISOString(),
              editedAt: thread.editedAt?.toISOString() ?? null,
              author: shapeForumAuthor(thread.author),
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

        <ThreadDiscussion
          threadId={thread.id}
          author={shapeForumAuthor(user)}
          mentionables={mentionables}
          posts={promptPosts}
        />
      </Page>
    </div>
  );
}
