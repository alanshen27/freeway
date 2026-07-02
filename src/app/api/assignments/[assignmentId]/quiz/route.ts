import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { AssignmentQuizData } from "@/lib/schemas";

const schema = z.object({ answers: z.array(z.number().int().min(0)) });

export async function POST(
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

  const data = assignment.data as AssignmentQuizData | null;
  if (assignment.type !== "QUIZ" || !data?.items?.length)
    return NextResponse.json({ error: "Not a quiz" }, { status: 400 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success || parsed.data.answers.length !== data.items.length)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const score = data.items.filter(
    (item, i) => parsed.data.answers[i] === item.answerIndex
  ).length;

  const result = {
    score,
    total: data.items.length,
    answers: parsed.data.answers,
    submittedAt: new Date().toISOString(),
  };

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      data: { ...data, result } as object,
      completedAt: assignment.completedAt ?? new Date(),
    },
  });

  return NextResponse.json({ result, assignment: updated });
}
