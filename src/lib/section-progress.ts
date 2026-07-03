import { prisma } from "@/lib/prisma";
import { awardLearningReward, type RewardResult } from "@/lib/gamification/rewards";

export async function getCompletedSectionIds(
  userId: string | undefined,
  sectionIds: string[]
): Promise<Set<string>> {
  if (!userId || sectionIds.length === 0) return new Set();
  const rows = await prisma.sectionProgress.findMany({
    where: { userId, sectionId: { in: sectionIds } },
    select: { sectionId: true, completedAt: true },
  });
  return new Set(
    rows.filter((r) => r.completedAt !== null).map((r) => r.sectionId)
  );
}

export async function getSectionProgressMap(
  userId: string | undefined,
  sectionIds: string[]
): Promise<
  Map<string, { completed: boolean; quizScore: number | null; quizTotal: number | null }>
> {
  const map = new Map<
    string,
    { completed: boolean; quizScore: number | null; quizTotal: number | null }
  >();
  if (!userId || sectionIds.length === 0) return map;

  const rows = await prisma.sectionProgress.findMany({
    where: { userId, sectionId: { in: sectionIds } },
    select: { sectionId: true, completedAt: true, quizScore: true, quizTotal: true },
  });
  for (const row of rows) {
    map.set(row.sectionId, {
      completed: row.completedAt !== null,
      quizScore: row.quizScore,
      quizTotal: row.quizTotal,
    });
  }
  return map;
}

export function firstIncompleteSection<
  T extends { id: string; order: number },
>(sections: T[], completed: Set<string>): T | undefined {
  return sections.find((s) => !completed.has(s.id));
}

export function lessonCompletionCount(
  sections: { id: string }[],
  completed: Set<string>
): { done: number; total: number } {
  const total = sections.length;
  const done = sections.filter((s) => completed.has(s.id)).length;
  return { done, total };
}

export type Completion = { done: number; total: number };

export function completionPct({ done, total }: Completion): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/** Learner completion (done/total sections) for each course. */
export async function getCourseCompletion(
  userId: string | undefined,
  courseIds: string[]
): Promise<Map<string, Completion>> {
  const map = new Map<string, Completion>(
    courseIds.map((id) => [id, { done: 0, total: 0 }])
  );
  if (courseIds.length === 0) return map;

  const sections = await prisma.lessonSection.findMany({
    where: { lesson: { subject: { courseId: { in: courseIds } } } },
    select: {
      id: true,
      lesson: { select: { subject: { select: { courseId: true } } } },
    },
  });
  const completed = await getCompletedSectionIds(
    userId,
    sections.map((s) => s.id)
  );
  for (const s of sections) {
    const c = map.get(s.lesson.subject.courseId);
    if (!c) continue;
    c.total += 1;
    if (completed.has(s.id)) c.done += 1;
  }
  return map;
}

/** The learner's most recent completed step, for "continue learning". */
export async function getLastActivity(userId: string | undefined) {
  if (!userId) return null;
  const rows = await prisma.sectionProgress.findMany({
    where: { userId },
    include: {
      section: {
        include: {
          lesson: {
            include: { subject: { include: { course: true } } },
          },
        },
      },
    },
  });
  return (
    rows
      .filter((r): r is typeof r & { completedAt: Date } => r.completedAt !== null)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0] ?? null
  );
}

async function syncLessonCompleted(lessonId: string, userId: string) {
  const all = await prisma.lessonSection.findMany({
    where: { lessonId },
    select: { id: true },
  });
  const completed = await getCompletedSectionIds(
    userId,
    all.map((s) => s.id)
  );
  const lessonDone = all.length > 0 && all.every((s) => completed.has(s.id));
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { completed: lessonDone },
  });
  return lessonDone;
}

/** Persist quiz score without marking the section complete. */
export async function saveSectionQuizScore(
  userId: string,
  sectionId: string,
  score: number,
  total: number
) {
  const section = await prisma.lessonSection.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) return null;

  await prisma.sectionProgress.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    create: { userId, sectionId, quizScore: score, quizTotal: total },
    update: { quizScore: score, quizTotal: total },
  });
  return { ok: true };
}

/** Mark a section complete and sync parent lesson when all sections are done. */
export async function markSectionComplete(
  userId: string,
  sectionId: string,
  opts?: { skipReward?: boolean }
) {
  const section = await prisma.lessonSection.findUnique({
    where: { id: sectionId },
    select: { lessonId: true },
  });
  if (!section) return null;

  const existing = await prisma.sectionProgress.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
    select: { completedAt: true },
  });

  await prisma.sectionProgress.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    create: { userId, sectionId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });

  const lessonDone = await syncLessonCompleted(section.lessonId, userId);

  let reward: RewardResult | null = null;
  if (!existing?.completedAt && !opts?.skipReward) {
    reward = await awardLearningReward(userId, 5);
  }

  return { lessonId: section.lessonId, lessonDone, reward };
}

/** Clear completion for one step so the learner can redo it. */
export async function resetSectionProgress(userId: string, sectionId: string) {
  const section = await prisma.lessonSection.findUnique({
    where: { id: sectionId },
    select: { lessonId: true },
  });
  if (!section) return null;

  await prisma.sectionProgress.deleteMany({
    where: { userId, sectionId },
  });
  await syncLessonCompleted(section.lessonId, userId);
  return { lessonId: section.lessonId };
}

/** Reset all steps in a lesson for this user. */
export async function resetLessonProgress(userId: string, lessonId: string) {
  const sections = await prisma.lessonSection.findMany({
    where: { lessonId },
    select: { id: true },
  });
  await prisma.sectionProgress.deleteMany({
    where: {
      userId,
      sectionId: { in: sections.map((s) => s.id) },
    },
  });
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { completed: false },
  });
  return { sectionCount: sections.length };
}

export async function findSectionForExercise(exerciseId: string) {
  return prisma.lessonSection.findFirst({
    where: {
      type: "EXERCISE",
      data: { path: ["exerciseId"], equals: exerciseId },
    },
    select: { id: true, lessonId: true },
  });
}

/** Remove generated curriculum so a course can be regenerated. Returns subjects removed. */
export async function clearCourseContent(courseId: string): Promise<number> {
  const deleted = await prisma.subject.deleteMany({ where: { courseId } });
  await prisma.exercise.deleteMany({
    where: { courseId, lessonId: null },
  });
  await prisma.assignment.deleteMany({ where: { courseId } });
  await prisma.course.update({
    where: { id: courseId },
    data: { progress: 0, status: "GENERATING" },
  });
  return deleted.count;
}
