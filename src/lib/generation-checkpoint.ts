import { prisma } from "@/lib/prisma";
import type { CourseBlueprint, SubjectBlueprint } from "@/lib/schemas";

export type GenerationCheckpoint = {
  blueprint: CourseBlueprint;
  subjectPlans: SubjectBlueprint[];
};

export async function loadLatestCheckpoint(
  courseId: string
): Promise<GenerationCheckpoint | null> {
  const jobs = await prisma.generationJob.findMany({
    where: { courseId },
    orderBy: { updatedAt: "desc" },
    take: 15,
    select: { result: true },
  });
  for (const job of jobs) {
    const cp = (job.result as { checkpoint?: GenerationCheckpoint } | null)
      ?.checkpoint;
    if (cp?.blueprint?.subjects?.length && cp.subjectPlans?.length) return cp;
  }
  return null;
}

export async function saveCheckpoint(
  jobId: string,
  checkpoint: GenerationCheckpoint
) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { result: true },
  });
  const prev = (job?.result as Record<string, unknown> | null) ?? {};
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { result: { ...prev, checkpoint } as object },
  });
}

/** True when the course has partial content and we should fill gaps instead of wiping. */
export async function shouldResumeGeneration(
  courseId: string,
  fresh: boolean
): Promise<boolean> {
  if (fresh) return false;
  const [subjectCount, course] = await Promise.all([
    prisma.subject.count({ where: { courseId } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { status: true },
    }),
  ]);
  return subjectCount > 0 && (course?.status === "FAILED" || course?.status === "GENERATING");
}
