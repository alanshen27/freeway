import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  userHasForumAccess,
  generateForumTutorReply,
} from "@/lib/forum";

function toLlmPosts(
  posts: {
    id: string;
    body: string;
    isAI: boolean;
    author: { id: string; name: string };
  }[]
) {
  return posts.map((p) => ({
    id: p.id,
    body: p.body,
    isAI: p.isAI,
    author: p.author,
  }));
}

/** First-time AI reply for a prompt post (no linked aiReply yet). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId, postId } = await params;

  const promptPost = await prisma.forumPost.findUnique({
    where: { id: postId },
    include: {
      aiReply: true,
      thread: {
        include: {
          author: { select: { id: true, name: true } },
          exercise: true,
        },
      },
    },
  });
  if (!promptPost || promptPost.threadId !== threadId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (promptPost.isAI)
    return NextResponse.json({ error: "Not a prompt post" }, { status: 400 });
  if (promptPost.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (promptPost.aiReply)
    return NextResponse.json({ error: "AI reply already exists" }, { status: 400 });

  if (!(await userHasForumAccess(user.id, promptPost.thread.trackSlug)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const posts = await prisma.forumPost.findMany({
    where: { threadId, aiThreadRootId: null },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const reply = await generateForumTutorReply({
    thread: {
      title: promptPost.thread.title,
      body: promptPost.thread.body,
      author: promptPost.thread.author,
    },
    posts: toLlmPosts(posts),
    asker: { id: user.id, name: user.name },
    exercise: promptPost.thread.exercise,
  });

  const aiPost = await prisma.forumPost.create({
    data: {
      threadId,
      authorId: user.id,
      body: reply,
      isAI: true,
      promptPostId: postId,
    },
  });

  return NextResponse.json({ aiPost });
}
