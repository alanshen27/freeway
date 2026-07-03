import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTrackParticipants } from "@/lib/forum";
import { resolveMentions } from "@/lib/mentions";

const schema = z.object({
  body: z.string().min(1),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId, postId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      threadId: true,
      authorId: true,
      isAI: true,
      thread: { select: { trackSlug: true } },
    },
  });
  if (!post || post.threadId !== threadId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (post.isAI)
    return NextResponse.json({ error: "AI replies can't be edited" }, { status: 400 });

  const candidates = await getTrackParticipants(post.thread.trackSlug, user.id);
  const mentionedUserIds = resolveMentions(parsed.data.body, candidates, user.id);

  const updated = await prisma.forumPost.update({
    where: { id: postId },
    data: { body: parsed.data.body, editedAt: new Date(), mentionedUserIds },
  });

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId, postId } = await params;
  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: { id: true, threadId: true, authorId: true, isAI: true },
  });
  if (!post || post.threadId !== threadId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (post.isAI)
    return NextResponse.json({ error: "AI replies can't be deleted directly" }, { status: 400 });

  await prisma.forumPost.delete({ where: { id: postId } });

  return NextResponse.json({ ok: true });
}
