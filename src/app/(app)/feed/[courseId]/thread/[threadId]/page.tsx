import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Paperclip } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Markdown } from "@/components/Markdown";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { timeAgo, initials } from "@/lib/utils";
import { Page, ContentBlock, ListPanel, ListRow } from "@/components/layout/Page";
import { ReplyBox } from "./ReplyBox";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ courseId: string; threadId: string }>;
}) {
  const { courseId, threadId } = await params;
  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: {
      author: true,
      exercise: { include: { lesson: true } },
      posts: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) notFound();

  return (
    <div>
      <PageHeader
        title={thread.title}
        eyebrow="Discussion"
        backHref={`/feed/${courseId}`}
      />
      <Page>
        <ContentBlock>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-brand-50 text-xs font-medium text-brand-700">
              {initials(thread.author.name)}
            </span>
            <span className="text-sm font-medium">{thread.author.name}</span>
            <span className="text-xs text-muted-foreground">
              · {timeAgo(thread.createdAt)}
            </span>
          </div>
          <div className="mt-3">
            <Markdown source={thread.body} />
          </div>
          {thread.exercise && (
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
          )}
        </ContentBlock>

        {thread.posts.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Replies ({thread.posts.length})
            </p>
            <ListPanel>
              {thread.posts.map((p) => (
                <ListRow key={p.id} className="items-start">
                  {p.isAI ? (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
                      <Sparkles className="size-4" />
                    </span>
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-medium">
                      {initials(p.author.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {p.isAI ? "AI Tutor" : p.author.name}
                      </span>
                      {p.isAI && <Badge variant="primary">AI</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(p.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Markdown source={p.body} />
                    </div>
                  </div>
                </ListRow>
              ))}
            </ListPanel>
          </div>
        )}

        <ReplyBox threadId={thread.id} />
      </Page>
    </div>
  );
}
