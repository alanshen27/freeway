import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  MessagesSquare,
  BookOpen,
  Play,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getCompletedSectionIds, completionPct } from "@/lib/section-progress";
import { PageHeader } from "@/components/PageHeader";
import { RegenerateCourseButton } from "@/components/course/RegenerateCourseButton";
import { DeleteCourseButton } from "@/components/course/DeleteCourseButton";
import { GenerationProgress } from "@/components/course/GenerationProgress";
import { CoverImage } from "@/components/lesson/CoverImage";
import { Page, Breadcrumbs } from "@/components/layout/Page";
import {
  courseStatusLabel,
  formatCategory,
  formatLevel,
  heroBadgeClass,
} from "@/lib/course-labels";
import { AssignmentRow } from "@/components/assignment/AssignmentRow";
import { NewAssignmentForm } from "@/components/assignment/NewAssignmentForm";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await getCurrentUser();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      subjects: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { sections: { select: { id: true }, orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const assignments = user
    ? await prisma.assignment.findMany({
        where: { courseId, userId: user.id },
        include: { milestones: { select: { completedAt: true } } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      })
    : [];

  const activeJob =
    course.status === "GENERATING"
      ? await prisma.generationJob.findFirst({
          where: { courseId, status: { in: ["QUEUED", "RUNNING"] } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;

  const allSectionIds = course.subjects.flatMap((s) =>
    s.lessons.flatMap((l) => l.sections.map((sec) => sec.id))
  );
  const completed = await getCompletedSectionIds(user?.id, allSectionIds);

  const courseDone = allSectionIds.filter((id) => completed.has(id)).length;
  const coursePct = completionPct({ done: courseDone, total: allSectionIds.length });
  const totalLessons = course.subjects.reduce((n, s) => n + s.lessons.length, 0);

  // First lesson with an incomplete section, for "Continue".
  const nextLesson = course.subjects
    .flatMap((s) => s.lessons)
    .find((l) => l.sections.some((sec) => !completed.has(sec.id)));

  return (
    <div>
      <PageHeader
        toolbar
        backHref="/courses"
        action={
          <div className="flex items-center gap-2">
            <RegenerateCourseButton
              courseId={course.id}
              disabled={course.status === "GENERATING"}
            />
            <Link
              href={`/feed/${course.id}`}
              aria-label="Forum"
              className="flex size-8 items-center justify-center rounded-md hover:bg-secondary"
            >
              <MessagesSquare className="size-5" />
            </Link>
            <DeleteCourseButton courseId={course.id} />
          </div>
        }
      />

      <Page wide>
        <Breadcrumbs
          items={[{ label: "Courses", href: "/courses" }, { label: course.title }]}
        />

        <section className="relative mt-2 overflow-hidden rounded-2xl bg-course-gradient text-white shadow-card">
          {course.coverImageUrl && (
            <>
              <CoverImage
                src={course.coverImageUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/65 to-slate-950/30" />
            </>
          )}
          <div className="relative p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className={heroBadgeClass}>{formatLevel(course.level)}</span>
              <span className={heroBadgeClass}>{formatCategory(course.category)}</span>
              {courseStatusLabel(course.status) && (
                <span className={heroBadgeClass}>
                  {course.status === "GENERATING" && (
                    <span className="size-1.5 animate-pulse rounded-full bg-white" />
                  )}
                  {courseStatusLabel(course.status)}
                </span>
              )}
            </div>
            <h1 className="mt-3 max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">
              {course.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
              {course.summary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/75">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5" />
                {course.subjects.length} modules
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5" />
                {totalLessons} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                {courseDone}/{allSectionIds.length} steps complete
              </span>
            </div>

            {allSectionIds.length > 0 && (
              <div className="mt-4 flex max-w-md items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${coursePct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold">{coursePct}%</span>
              </div>
            )}

            {nextLesson && (
              <Link
                href={`/lessons/${nextLesson.id}/continue`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-white/90"
              >
                <Play className="size-4" />
                {courseDone === 0 ? "Start course" : "Continue learning"}
              </Link>
            )}
          </div>
        </section>

        {course.status === "GENERATING" && (
          <div className="mt-6">
            {activeJob ? (
              <GenerationProgress jobId={activeJob.id} courseId={course.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This course is still being generated. Check back shortly.
              </p>
            )}
          </div>
        )}

        {course.status === "FAILED" && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-blush/30 bg-blush-soft px-4 py-3">
            <p className="flex-1 text-sm text-blush">
              Generation didn&apos;t finish. Use Regenerate to run it again.
            </p>
            <RegenerateCourseButton courseId={course.id} />
          </div>
        )}

        {course.status === "READY" && (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Assignments
              </h2>
              <NewAssignmentForm courseId={course.id} />
            </div>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assignments yet — generate one to practice what you&apos;re learning.
              </p>
            ) : (
              <div className="space-y-2.5">
                {assignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    milestones={a.milestones}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {course.subjects.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Course content
            </h2>
            <div className="space-y-3">
              {course.subjects.map((s, i) => {
                const sectionIds = s.lessons.flatMap((l) =>
                  l.sections.map((sec) => sec.id)
                );
                const done = sectionIds.filter((id) => completed.has(id)).length;
                const pct = completionPct({ done, total: sectionIds.length });
                const moduleComplete = sectionIds.length > 0 && done === sectionIds.length;

                return (
                  <Link
                    key={s.id}
                    href={`/subjects/${s.id}`}
                    className={cn("group flex items-center gap-4 rounded-xl border border-border p-4 shadow-card transition-all hover:border-brand-100 hover:shadow-md",
                      moduleComplete ? "bg-green-100" : "bg-white",
                      course.status === "GENERATING" ? "bg-amber-100" : "")}
                  >
                    {s.imageUrl ? (
                      <CoverImage
                        src={s.imageUrl}
                        alt={s.title}
                        className="hidden size-16 shrink-0 rounded-lg object-cover sm:block"
                      />
                    ) : (
                      <span className="hidden size-16 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 sm:flex">
                        <BookOpen className="size-6" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Module {i + 1}
                        {moduleComplete && (
                          <CheckCircle2 className="ml-1.5 inline size-3.5 align-[-2px] text-mint" />
                        )}
                      </p>
                      <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {s.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {s.summary}
                      </p>
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="h-1.5 w-full max-w-[10rem] overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {s.lessons.length} lessons · {pct}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </Page>
    </div>
  );
}
