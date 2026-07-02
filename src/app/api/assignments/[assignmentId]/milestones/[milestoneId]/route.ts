import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({ completed: z.boolean() });

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ assignmentId: string; milestoneId: string }>;
  }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId, milestoneId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { milestones: true },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!assignment.milestones.some((m) => m.id === milestoneId))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const milestone = await prisma.assignmentMilestone.update({
    where: { id: milestoneId },
    data: { completedAt: parsed.data.completed ? new Date() : null },
  });

  // Completing every milestone completes the assignment (and vice versa).
  const others = assignment.milestones.filter((m) => m.id !== milestoneId);
  const allDone =
    parsed.data.completed && others.every((m) => m.completedAt !== null);
  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: { completedAt: allDone ? new Date() : parsed.data.completed ? assignment.completedAt : null },
  });

  return NextResponse.json({ milestone, assignment: updated });
}
