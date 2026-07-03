import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  userHasForumAccess,
  generateForumTutorFollowUpReply,
} from "@/lib/forum";

const schema = z.object({
  body: z.string().min(1),
});

function toLlmPost(post: {
  id: string;
  body: string;
  isAI: boolean;
  author: { id: string; name: string; avatarUrl?: string | null };
}) {
  return {
    id: post.id,
    body: post.body,
    isAI: post.isAI,
    author: post.author,
  };
}

/** Post a follow-up in the private AI tutor sub-thread; AI replies to every message. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId, postId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const promptPost = await prisma.forumPost.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      aiReply: { include: { author: { select: { id: true, name: true } } } },
      thread: {
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          exercise: true,
        },
      },
    },
  });
  if (!promptPost || promptPost.threadId !== threadId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (promptPost.isAI || promptPost.aiThreadRootId)
    return NextResponse.json({ error: "Not a prompt post" }, { status: 400 });
  if (promptPost.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!promptPost.aiReply)
    return NextResponse.json({ error: "No AI reply yet" }, { status: 400 });

  if (!(await userHasForumAccess(user.id, promptPost.thread.trackSlug)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rootId = promptPost.aiReply.id;

  const humanPost = await prisma.forumPost.create({
    data: {
      threadId,
      authorId: user.id,
      body: parsed.data.body,
      aiThreadRootId: rootId,
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const publicPosts = await prisma.forumPost.findMany({
    where: { threadId, aiThreadRootId: null },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  const subThreadPosts = await prisma.forumPost.findMany({
    where: { aiThreadRootId: rootId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  const reply = await generateForumTutorFollowUpReply({
    thread: {
      title: promptPost.thread.title,
      body: promptPost.thread.body,
      author: promptPost.thread.author,
    },
    publicPosts: publicPosts.map(toLlmPost),
    promptPost: toLlmPost(promptPost),
    initialAiReply: toLlmPost(promptPost.aiReply),
    subThread: subThreadPosts.map(toLlmPost),
    asker: { id: user.id, name: user.name },
    exercise: promptPost.thread.exercise,
  });

  const aiPost = await prisma.forumPost.create({
    data: {
      threadId,
      authorId: user.id,
      body: reply,
      isAI: true,
      aiThreadRootId: rootId,
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ humanPost, aiPost });
}
