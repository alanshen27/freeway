import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { gradeAttempt } from "@/lib/grade";
import { findSectionForExercise, markSectionComplete } from "@/lib/section-progress";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { exerciseId } = await params;
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { answer } = (await req.json()) as { answer: unknown };
  const result = await gradeAttempt(exercise, answer);

  await prisma.exerciseAttempt.create({
    data: {
      exerciseId,
      userId: user.id,
      answer: answer as object,
      status: result.status,
      score: result.score,
      feedback: result.feedback,
    },
  });

  if (result.status === "PASSED") {
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: 10 } },
    });
    const section = await findSectionForExercise(exerciseId);
    if (section) {
      await markSectionComplete(user.id, section.id);
    }
  }

  return NextResponse.json(result);
}
