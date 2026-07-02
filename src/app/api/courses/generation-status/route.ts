import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type LogEntry = { step: string; msg: string };

/** Latest active generation job per course — for course list live previews. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const jobs = await prisma.generationJob.findMany({
    where: {
      userId: user.id,
      courseId: { not: null },
      status: { in: ["QUEUED", "RUNNING"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      courseId: true,
      status: true,
      progress: true,
      step: true,
      logs: true,
    },
  });

  const byCourse: Record<
    string,
    { jobId: string; status: string; progress: number; step: string; message: string }
  > = {};

  for (const job of jobs) {
    if (!job.courseId || byCourse[job.courseId]) continue;
    const logs = (job.logs as LogEntry[]) ?? [];
    byCourse[job.courseId] = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      step: job.step,
      message: logs[logs.length - 1]?.msg ?? "Starting generation…",
    };
  }

  return NextResponse.json({ courses: byCourse });
}
