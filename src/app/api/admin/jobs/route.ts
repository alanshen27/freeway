import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminForbidden, requireAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await requireAdmin())) return adminForbidden();

  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      course: { select: { id: true, title: true, status: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const stats = {
    total: jobs.length,
    queued: jobs.filter((j) => j.status === "QUEUED").length,
    running: jobs.filter((j) => j.status === "RUNNING").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
    completed: jobs.filter((j) => j.status === "COMPLETED").length,
    orphaned: jobs.filter((j) => !j.courseId).length,
  };

  return NextResponse.json({
    stats,
    jobs: jobs.map((j) => ({
      id: j.id,
      courseId: j.courseId,
      courseTitle: j.course?.title ?? null,
      courseStatus: j.course?.status ?? null,
      userId: j.userId,
      userName: j.user.name,
      userEmail: j.user.email,
      type: j.type,
      status: j.status,
      progress: j.progress,
      step: j.step,
      error: j.error,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    })),
  });
}
