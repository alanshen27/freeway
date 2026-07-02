import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { awardLearningReward } from "@/lib/gamification/rewards";

const schema = z.object({
  completed: z.boolean().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const wasComplete = assignment.completedAt !== null;
  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(parsed.data.completed !== undefined && {
        completedAt: parsed.data.completed ? new Date() : null,
      }),
      ...(parsed.data.dueAt !== undefined && {
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      }),
    },
  });

  let reward = null;
  if (parsed.data.completed === true && !wasComplete) {
    reward = await awardLearningReward(user.id, 15);
  }

  return NextResponse.json({ assignment: updated, reward });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.assignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ ok: true });
}
