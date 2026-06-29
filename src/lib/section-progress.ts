import { prisma } from "@/lib/prisma";

export async function getCompletedSectionIds(
  userId: string | undefined,
  sectionIds: string[]
): Promise<Set<string>> {
  if (!userId || sectionIds.length === 0) return new Set();
  const rows = await prisma.sectionProgress.findMany({
    where: { userId, sectionId: { in: sectionIds } },
    select: { sectionId: true },
  });
  return new Set(rows.map((r) => r.sectionId));
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

/** Mark a section complete and sync parent lesson when all sections are done. */
export async function markSectionComplete(userId: string, sectionId: string) {
  const section = await prisma.lessonSection.findUnique({
    where: { id: sectionId },
    select: { lessonId: true },
  });
  if (!section) return null;

  await prisma.sectionProgress.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    create: { userId, sectionId },
    update: { completedAt: new Date() },
  });

  const lessonDone = await syncLessonCompleted(section.lessonId, userId);
  return { lessonId: section.lessonId, lessonDone };
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
  await prisma.course.update({
    where: { id: courseId },
    data: { progress: 0, status: "GENERATING" },
  });
  return deleted.count;
}
