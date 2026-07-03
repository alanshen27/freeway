import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTrackParticipants, userHasForumAccess } from "@/lib/forum";
import { resolveMentions } from "@/lib/mentions";
import { shapeForumPromptPosts } from "@/lib/forum-thread-posts";

const schema = z.object({
  title: z.string().min(2).max(160).optional(),
  body: z.string().min(1).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId } = await params;
  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: {
      posts: {
        include: { author: true, aiReply: { include: { author: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await userHasForumAccess(user.id, thread.trackSlug)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    posts: shapeForumPromptPosts(thread, thread.posts, user.id),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (!parsed.data.title && !parsed.data.body)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { id: true, authorId: true, trackSlug: true },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let mentionedUserIds: string[] | undefined;
  if (parsed.data.body) {
    const candidates = await getTrackParticipants(thread.trackSlug, user.id);
    mentionedUserIds = resolveMentions(parsed.data.body, candidates, user.id);
  }

  const updated = await prisma.forumThread.update({
    where: { id: threadId },
    data: {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.body ? { body: parsed.data.body } : {}),
      ...(mentionedUserIds ? { mentionedUserIds } : {}),
      editedAt: new Date(),
    },
  });

  return NextResponse.json({ thread: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId } = await params;
  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { id: true, authorId: true },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Posts cascade-delete with the thread (onDelete: Cascade in schema).
  await prisma.forumThread.delete({ where: { id: threadId } });

  return NextResponse.json({ ok: true });
}
