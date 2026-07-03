import type { Assignment } from "@prisma/client";
import type { AssignmentQuizData, QuestionsSectionData } from "@/lib/schemas";

export type SectionQuizProgress = {
  completed: boolean;
  quizScore: number | null;
  quizTotal: number | null;
};

/** Marks label for assignment quizzes: "7/10" when done, "10 marks" when not. */
export function assignmentQuizMarks(
  assignment: Pick<Assignment, "type" | "data" | "completedAt">
): string | null {
  if (assignment.type !== "QUIZ") return null;
  const data = assignment.data as AssignmentQuizData | null;
  const total = data?.items?.length ?? 0;
  if (total === 0) return null;

  const result = data?.result;
  if (assignment.completedAt && result) {
    return `${result.score}/${result.total}`;
  }
  return `${total} ${total === 1 ? "mark" : "marks"}`;
}

/** Marks label for lesson QUESTIONS sections. */
export function sectionQuizMarks(
  sectionType: string,
  sectionData: unknown,
  progress: SectionQuizProgress | undefined
): string | null {
  if (sectionType !== "QUESTIONS") return null;
  const data = sectionData as QuestionsSectionData;
  const total = data?.items?.length ?? 0;
  if (total === 0) return null;

  if (
    progress?.completed &&
    progress.quizScore != null &&
    progress.quizTotal != null
  ) {
    return `${progress.quizScore}/${progress.quizTotal}`;
  }
  return `${total} ${total === 1 ? "mark" : "marks"}`;
}
