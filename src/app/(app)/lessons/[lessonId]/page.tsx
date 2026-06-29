import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, Play } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getCompletedSectionIds,
  firstIncompleteSection,
  lessonCompletionCount,
} from "@/lib/section-progress";
import { PageHeader } from "@/components/PageHeader";
import { Page, Breadcrumbs, ListPanel } from "@/components/layout/Page";
import { SECTION_META, isSectionTypeKey } from "@/lib/section-types";
import { CoverImage } from "@/components/lesson/CoverImage";
import { RedoLessonButton, RedoSectionButton } from "@/components/lesson/RedoButtons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LessonHubPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      sections: { orderBy: { order: "asc" } },
      subject: { include: { course: true } },
    },
  });
  if (!lesson) notFound();

  const course = lesson.subject.course;
  const completed = await getCompletedSectionIds(
    user?.id,
    lesson.sections.map((s) => s.id)
  );
  const { done, total } = lessonCompletionCount(lesson.sections, completed);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const next = firstIncompleteSection(lesson.sections, completed);

  return (
    <div>
      <PageHeader title={lesson.title} />
      <Page className="py-5 sm:py-8">
        <div className="mx-auto max-w-2xl">
          {lesson.imageUrl && (
            <CoverImage
              src={lesson.imageUrl}
              alt={lesson.title}
              className="mb-6 aspect-[2/1] w-full rounded-lg object-cover"
            />
          )}
          <header className="border-b border-border pb-6">
            <Breadcrumbs
              items={[
                { label: course.title, href: `/courses/${course.id}` },
                { label: lesson.subject.title, href: `/subjects/${lesson.subjectId}` },
                { label: lesson.title },
              ]}
            />
            <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {lesson.title}
            </h1>
            {lesson.summary && (
              <p className="mt-2 text-sm text-muted-foreground">{lesson.summary}</p>
            )}

            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>
                  {done}/{total} steps complete
                </span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {next && (
              <Link
                href={`/lessons/${lessonId}/sections/${next.id}`}
                className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Play className="size-4" />
                {done === 0 ? "Start lesson" : "Continue"}
              </Link>
            )}
            {done > 0 && (
              <div className="mt-3 flex justify-center">
                <RedoLessonButton lessonId={lessonId} />
              </div>
            )}
          </header>

          <ListPanel flat className="mt-2">
            {lesson.sections.map((section, index) => {
              const meta = isSectionTypeKey(section.type)
                ? SECTION_META[section.type]
                : null;
              const isDone = completed.has(section.id);
              const { Icon } = meta ?? { Icon: Circle };

              return (
                <div
                  key={section.id}
                  className="flex items-center gap-1 border-b border-border px-4 py-3.5 last:border-0 hover:bg-secondary/50"
                >
                  <Link
                    href={`/lessons/${lessonId}/sections/${section.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                      {index + 1}
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
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {section.title ?? meta?.label ?? section.type}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                  {isDone && <RedoSectionButton sectionId={section.id} />}
                </div>
              );
            })}
          </ListPanel>
        </div>
      </Page>
    </div>
  );
}
