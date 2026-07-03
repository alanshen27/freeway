import type { ForumPost, ForumThread, User } from "@prisma/client";
import { shapeForumAuthor, type ForumPromptPostPayload } from "@/lib/forum-types";

export type { ForumPromptPostPayload };

type PostWithRelations = ForumPost & {
  author: User;
  aiReply: (ForumPost & { author: User }) | null;
};

export function shapeForumPromptPosts(
  thread: ForumThread,
  posts: PostWithRelations[],
  viewerId: string
): ForumPromptPostPayload[] {
  const aiThreadByRoot = new Map<string, PostWithRelations[]>();
  for (const p of posts) {
    if (!p.aiThreadRootId) continue;
    const list = aiThreadByRoot.get(p.aiThreadRootId) ?? [];
    list.push(p);
    aiThreadByRoot.set(p.aiThreadRootId, list);
  }

  function shapeAiThread(rootId: string) {
    return (aiThreadByRoot.get(rootId) ?? []).map((p) => ({
      id: p.id,
      body: p.body,
      isAI: p.isAI,
      createdAt: p.createdAt.toISOString(),
      editedAt: p.editedAt?.toISOString() ?? null,
      author: p.isAI
        ? { name: "AI Tutor" }
        : shapeForumAuthor(p.author),
    }));
  }

  return posts
    .filter((p) => !p.isAI && !p.aiThreadRootId)
    .map((p) => ({
      id: p.id,
      isAuthor: p.authorId === viewerId,
      post: {
        id: p.id,
        body: p.body,
        isAI: false,
        createdAt: p.createdAt.toISOString(),
        editedAt: p.editedAt?.toISOString() ?? null,
        author: shapeForumAuthor(p.author),
      },
      aiReply: p.aiReply
        ? {
            id: p.aiReply.id,
            body: p.aiReply.body,
            isAI: true,
            createdAt: p.aiReply.createdAt.toISOString(),
            editedAt: p.aiReply.editedAt?.toISOString() ?? null,
            author: { name: p.aiReply.author.name },
          }
        : null,
      aiThread:
        p.aiReply && p.authorId === viewerId ? shapeAiThread(p.aiReply.id) : [],
    }));
}

export function latestForumActivityAt(
  thread: Pick<ForumThread, "createdAt">,
  posts: Pick<ForumPost, "createdAt">[]
) {
  let latest = thread.createdAt;
  for (const p of posts) {
    if (p.createdAt > latest) latest = p.createdAt;
  }
  return latest;
}
