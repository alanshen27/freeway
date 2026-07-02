import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminForbidden, requireAdmin } from "@/lib/admin";
import { jobDurationSec, parseJobLlmCost } from "@/lib/generation-jobs";

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

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

  let completedCostUsd = 0;
  let completedWithCost = 0;

  const rows = jobs.map((j) => {
    const cost = parseJobLlmCost(j.result);
    const durationSec = jobDurationSec(j.createdAt, j.updatedAt, j.status);
    if (j.status === "COMPLETED" && cost.totalUsd != null) {
      completedCostUsd += cost.totalUsd;
      completedWithCost += 1;
    }
    return {
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
      durationSec,
      durationLabel: durationSec != null ? formatDuration(durationSec) : null,
      llmCostUsd: cost.totalUsd,
      llmCalls: cost.calls,
      llmInputTokens: cost.inputTokens,
      llmOutputTokens: cost.outputTokens,
    };
  });

  const stats = {
    total: jobs.length,
    queued: jobs.filter((j) => j.status === "QUEUED").length,
    running: jobs.filter((j) => j.status === "RUNNING").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
    completed: jobs.filter((j) => j.status === "COMPLETED").length,
    orphaned: jobs.filter((j) => !j.courseId).length,
    completedCostUsd: Math.round(completedCostUsd * 1_000_000) / 1_000_000,
    avgCompletedCostUsd:
      completedWithCost > 0
        ? Math.round((completedCostUsd / completedWithCost) * 1_000_000) / 1_000_000
        : null,
  };

  return NextResponse.json({ stats, jobs: rows });
}
