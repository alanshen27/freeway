import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { enqueueCourseGeneration } from "@/lib/queue";
import { shouldResumeGeneration } from "@/lib/generation-checkpoint";
import { withApiLog } from "@/lib/api-log";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  return withApiLog("POST /api/courses/:courseId/generate", { courseId }, async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { fresh?: boolean };
  const resume = await shouldResumeGeneration(courseId, body.fresh === true);

  await prisma.course.update({
    where: { id: courseId },
    data: { status: "GENERATING" },
  });
  const job = await prisma.generationJob.create({
    data: { courseId, userId: user.id, type: "course" },
  });
  const { mode } = await enqueueCourseGeneration({
    jobId: job.id,
    courseId,
    userId: user.id,
    resume,
  });
  return NextResponse.json({ jobId: job.id, courseId, mode, resume });
  });
}
