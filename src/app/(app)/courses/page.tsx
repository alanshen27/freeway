import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, GraduationCap, Play } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getCourseCompletion,
  getLastActivity,
  completionPct,
} from "@/lib/section-progress";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/layout/Page";
import { CoverImage } from "@/components/lesson/CoverImage";
import { CoursesList } from "./CoursesList";

export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");
  const courses = await prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const completion = await getCourseCompletion(
    user.id,
    courses.map((c) => c.id)
  );
  const lastActivity = await getLastActivity(user.id);

  const totals = [...completion.values()].reduce(
    (acc, c) => ({ done: acc.done + c.done, total: acc.total + c.total }),
    { done: 0, total: 0 }
  );
  const inProgress = courses.filter((c) => {
    const comp = completion.get(c.id);
    return comp && comp.done > 0 && comp.done < comp.total;
  }).length;
  const completedCourses = courses.filter((c) => {
    const comp = completion.get(c.id);
    return comp && comp.total > 0 && comp.done === comp.total;
  }).length;

  const resume =
    lastActivity && lastActivity.section.lesson.subject.course.ownerId === user.id
      ? lastActivity.section.lesson
      : null;
  const resumeCourse = resume?.subject.course;
  const resumeComp = resumeCourse ? completion.get(resumeCourse.id) : undefined;
  const resumePct = resumeComp ? completionPct(resumeComp) : 0;

  const firstName = user.name.split(" ")[0];

  return (
    <Page wide className="pt-4 lg:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Dashboard</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {firstName}&apos;s courses
          </h1>
        </div>
        <Button asChild variant="default" size="sm">
          <Link href="/add">
            <Plus className="size-4" />
            New course
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="size-7" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            No courses yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Choose a career path to generate a personalized, hands-on course.
          </p>
          <Button asChild className="mt-6" size="sm">
            <Link href="/add">
              <Plus className="size-4" />
              Create your first course
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-x-4">
            <Stat value={courses.length} label="courses" />
            <span className="hidden text-border sm:inline">·</span>
            <Stat value={inProgress} label="in progress" />
            <span className="hidden text-border sm:inline">·</span>
            <Stat value={totals.done} label="steps completed" />
            <span className="hidden text-border sm:inline">·</span>
            <Stat value={completedCourses} label="courses finished" />
          </div>

          {resume && resumeCourse && resumePct < 100 && (
            <section className="mt-6 overflow-hidden rounded-2xl bg-course-gradient text-white shadow-card">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                {resumeCourse.coverImageUrl && (
                  <CoverImage
                    src={resumeCourse.coverImageUrl}
                    alt=""
                    className="hidden h-24 w-40 shrink-0 rounded-xl object-cover ring-1 ring-white/20 sm:block"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/75">
                    Continue learning
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold">
                    {resumeCourse.title}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-white/80">
                    {resume.subject.title} · {resume.title}
                  </p>
                  <div className="mt-3 flex max-w-sm items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${resumePct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-white/90">
                      {resumePct}%
                    </span>
                  </div>
                </div>
                <Link
                  href={`/lessons/${resume.id}/continue`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-white/90"
                >
                  <Play className="size-4" />
                  Resume
                </Link>
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground">
              My courses
            </h2>
            <CoursesList
              key={q ?? ""}
              initialQuery={q}
              courses={courses.map((c) => {
                const comp = completion.get(c.id);
                return {
                  id: c.id,
                  title: c.title,
                  summary: c.summary,
                  progress: comp ? completionPct(comp) : 0,
                  lessonsDone: comp?.done ?? 0,
                  lessonsTotal: comp?.total ?? 0,
                  status: c.status,
                  level: c.level,
                  category: c.category,
                  isTaster: c.isTaster,
                  coverImageUrl: c.coverImageUrl,
                };
              })}
            />
          </section>
        </>
      )}
    </Page>
  );
}
