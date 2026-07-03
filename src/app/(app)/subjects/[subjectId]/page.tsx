import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, Play } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getCompletedSectionIds,
  getSectionProgressMap,
  lessonCompletionCount,
} from "@/lib/section-progress";
import { sectionQuizMarks } from "@/lib/quiz-marks";
import { PageHeader } from "@/components/PageHeader";
import { Page, Breadcrumbs } from "@/components/layout/Page";
import { SECTION_META, isSectionTypeKey } from "@/lib/section-types";
import { CoverImage } from "@/components/lesson/CoverImage";
import { RedoLessonButton, RedoSectionButton } from "@/components/lesson/RedoButtons";
import {
  MarkLessonCompleteButton,
  MarkSubjectCompleteButton,
} from "@/components/lesson/MarkCompleteButtons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const user = await getCurrentUser();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      course: true,
      lessons: {
        orderBy: { order: "asc" },
        include: {
          sections: {
            select: { id: true, type: true, title: true, order: true, data: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
  if (!subject) notFound();

  const allSectionIds = subject.lessons.flatMap((l) =>
    l.sections.map((s) => s.id)
  );
  const completed = await getCompletedSectionIds(user?.id, allSectionIds);
  const progressMap = await getSectionProgressMap(user?.id, allSectionIds);
  const moduleDone =
    allSectionIds.length > 0 && allSectionIds.every((id) => completed.has(id));
  const moduleIncomplete = allSectionIds.length - completed.size;

  return (
    <div>
      <PageHeader title={subject.title} eyebrow="Module" backHref={`/courses/${subject.courseId}`} wide={true} />
      <Page wide>
        <Breadcrumbs
          items={[
            { label: subject.course.title, href: `/courses/${subject.courseId}` },
            { label: subject.title },
          ]}
        />

        {subject.imageUrl && (
          <CoverImage
            src={subject.imageUrl}
            alt={subject.title}
            className="mt-4 aspect-[21/9] w-full max-w-3xl rounded-xl object-cover"
          />
        )}

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {subject.summary}
        </p>
        {subject.goals.length > 0 && (
          <ul className="mt-4 max-w-3xl space-y-1.5 text-sm text-muted-foreground">
            {subject.goals.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="text-primary">·</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        )}

        {!moduleDone && allSectionIds.length > 0 && (
          <div className="mt-5">
            <MarkSubjectCompleteButton
              subjectId={subject.id}
              subjectTitle={subject.title}
              lessonCount={subject.lessons.length}
              sectionCount={allSectionIds.length}
              incompleteCount={moduleIncomplete}
            />
          </div>
        )}

        <h2 className="mb-4 mt-8 text-sm font-semibold text-foreground">
          Lessons
        </h2>

        <div className="space-y-4">
          {subject.lessons.map((lesson, lessonIndex) => {
            const { done, total } = lessonCompletionCount(lesson.sections, completed);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const lessonComplete = total > 0 && done === total;

            return (
              <article
                key={lesson.id}
                className="overflow-hidden rounded-xl border border-border bg-white shadow-card"
              >
                <div className="flex items-start gap-4 border-b border-border bg-slate-50/60 p-4">
                  {lesson.imageUrl ? (
                    <CoverImage
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      className="hidden size-14 shrink-0 rounded-lg object-cover sm:block"
                    />
                  ) : (
                    <span className="hidden size-14 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-600 sm:flex">
                      {lessonIndex + 1}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Lesson {lessonIndex + 1}
                      {lessonComplete && (
                        <CheckCircle2
                          className="ml-1.5 inline size-3.5 align-[-2px] text-mint"
                          aria-label="Complete"
                        />
                      )}
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-foreground">
                      {lesson.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {lesson.summary}
                    </p>
                    <div className="mt-3 flex max-w-xs items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {done}/{total} · {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      href={`/lessons/${lesson.id}/continue`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        lessonComplete
                          ? "bg-secondary text-foreground hover:bg-secondary/70"
                          : "bg-primary text-white hover:bg-primary/90"
                      )}
                    >
                      <Play className="size-3.5" />
                      {done === 0 ? "Start" : lessonComplete ? "Review" : "Resume"}
                    </Link>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!lessonComplete && total > 0 && (
                        <MarkLessonCompleteButton
                          lessonId={lesson.id}
                          lessonTitle={lesson.title}
                          sectionCount={total}
                          incompleteCount={total - done}
                        />
                      )}
                      {done > 0 && <RedoLessonButton lessonId={lesson.id} />}
                    </div>
                  </div>
                </div>

                <ul className="divide-y divide-border">
                  {lesson.sections.map((section, sectionIndex) => {
                    const meta = isSectionTypeKey(section.type)
                      ? SECTION_META[section.type]
                      : null;
                    const isDone = completed.has(section.id);
                    const { Icon } = meta ?? { Icon: Circle };
                    const marks = sectionQuizMarks(
                      section.type,
                      section.data,
                      progressMap.get(section.id)
                    );

                    return (
                      <li key={section.id}>
                        <div className="flex items-center gap-1 px-3 py-3 transition-colors hover:bg-secondary/40 sm:px-4">
                          <Link
                            href={`/lessons/${lesson.id}/sections/${section.id}`}
                            className="flex min-w-0 flex-1 items-center gap-3"
                          >
                            {isDone ? (
                              <CheckCircle2 className="size-4 shrink-0 text-mint" />
                            ) : (
                              <Circle className="size-4 shrink-0 text-muted-foreground/35" />
                            )}
                            <span className="w-4 text-xs text-muted-foreground">
                              {sectionIndex + 1}
                            </span>
                            {meta && (
                              <span
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                                  meta.bg
                                )}
                              >
                                <Icon className={cn("size-3.5", meta.color)} />
                              </span>
                            )}
                            <span
                              className={cn(
                                "min-w-0 flex-1 text-sm",
                                isDone && "text-muted-foreground"
                              )}
                            >
                              {section.title ?? meta?.label ?? section.type}
                            </span>
                            {meta && (
                              <span className="hidden text-xs text-muted-foreground sm:block">
                                {meta.shortLabel}
                              </span>
                            )}
                            {marks && (
                              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                                {marks}
                              </span>
                            )}
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          </Link>
                          {isDone && <RedoSectionButton sectionId={section.id} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </Page>
    </div>
  );
}
