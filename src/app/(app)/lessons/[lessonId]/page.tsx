import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getCompletedSectionIds,
  firstIncompleteSection,
} from "@/lib/section-progress";

export const dynamic = "force-dynamic";

/** Lesson hub removed — resume at the first incomplete step (or module if empty). */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!lesson) notFound();

  if (lesson.sections.length === 0) {
    redirect(`/subjects/${lesson.subjectId}`);
  }

  const completed = await getCompletedSectionIds(
    user?.id,
    lesson.sections.map((s) => s.id)
  );
  const target =
    firstIncompleteSection(lesson.sections, completed) ?? lesson.sections[0];

  redirect(`/lessons/${lessonId}/sections/${target.id}`);
}
