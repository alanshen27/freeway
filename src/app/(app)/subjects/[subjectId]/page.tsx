import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, Play } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getCompletedSectionIds,
  lessonCompletionCount,
} from "@/lib/section-progress";
import { PageHeader } from "@/components/PageHeader";
import { Page, Breadcrumbs } from "@/components/layout/Page";
import { SECTION_META, isSectionTypeKey } from "@/lib/section-types";
import { CoverImage } from "@/components/lesson/CoverImage";
import { RedoLessonButton, RedoSectionButton } from "@/components/lesson/RedoButtons";
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
            select: { id: true, type: true, title: true, order: true },
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

  return (
    <div>
      <PageHeader title={subject.title} />
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

        <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Lessons
        </h2>

        <div className="mt-8 space-y-10">
          {subject.lessons.map((lesson, lessonIndex) => {
            const { done, total } = lessonCompletionCount(lesson.sections, completed);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const lessonComplete = total > 0 && done === total;

            return (
              <article
                key={lesson.id}
                className="border-b border-border pb-10 last:border-0"
              >
                <Link
                  href={`/lessons/${lesson.id}/continue`}
                  className="flex items-start gap-4 py-2 transition-colors hover:opacity-90"
                >
                  {lesson.imageUrl ? (
                    <CoverImage
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      className="size-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                      {lessonIndex + 1}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{lesson.title}</h3>
                      {lessonComplete && (
                        <CheckCircle2 className="size-4 text-primary" aria-label="Complete" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {lesson.summary}
                    </p>
                    <div className="mt-3 max-w-xs">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {done}/{total} steps
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    <Play className="size-3.5" />
                    {done === 0 ? "Start" : "Resume"}
                  </span>
                </Link>
                {done > 0 && (
                  <div className="py-2">
                    <RedoLessonButton lessonId={lesson.id} />
                  </div>
                )}

                <ul className="mt-2 divide-y divide-border border-t border-border">
                  {lesson.sections.map((section, sectionIndex) => {
                    const meta = isSectionTypeKey(section.type)
                      ? SECTION_META[section.type]
                      : null;
                    const isDone = completed.has(section.id);
                    const { Icon } = meta ?? { Icon: Circle };

                    return (
                      <li key={section.id}>
                        <div className="flex items-center gap-1 py-3 pl-2 transition-colors hover:bg-secondary/40 sm:pl-4">
                        <Link
                          href={`/lessons/${lesson.id}/sections/${section.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-4 shrink-0 text-primary" />
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
                          <span className="min-w-0 flex-1 text-sm">
                            {section.title ?? meta?.label ?? section.type}
                          </span>
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
