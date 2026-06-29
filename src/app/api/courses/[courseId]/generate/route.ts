import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { enqueueCourseGeneration } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  });
  return NextResponse.json({ jobId: job.id, courseId, mode });
}
