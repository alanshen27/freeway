import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { userHasForumAccess } from "@/lib/forum";

const schema = z.object({
  body: z.string().min(1),
  askAI: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { id: true, trackSlug: true },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await userHasForumAccess(user.id, thread.trackSlug)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const post = await prisma.forumPost.create({
    data: { threadId, authorId: user.id, body: parsed.data.body },
  });

  return NextResponse.json({
    post,
    aiPending: parsed.data.askAI,
  });
}
