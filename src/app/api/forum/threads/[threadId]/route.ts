import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  title: z.string().min(2).max(160).optional(),
  body: z.string().min(1).optional(),
});

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
    select: { id: true, authorId: true },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.authorId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.forumThread.update({
    where: { id: threadId },
    data: {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.body ? { body: parsed.data.body } : {}),
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
