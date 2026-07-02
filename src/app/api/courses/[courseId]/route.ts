import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cancelCourseQueueJobs } from "@/lib/queue";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Stop BullMQ workers first — DB cascade deletes GenerationJob rows afterward.
  await cancelCourseQueueJobs(courseId);

  // Relations (subjects, lessons, sections, exercises, threads, jobs,
  // assignments) cascade via the schema.
  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ ok: true });
}
