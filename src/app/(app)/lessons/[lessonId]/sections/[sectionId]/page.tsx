import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getCompletedSectionIds } from "@/lib/section-progress";
import { PageHeader } from "@/components/PageHeader";
import { Page, Breadcrumbs } from "@/components/layout/Page";
import { SectionView } from "@/components/lesson/SectionView";
import { SectionFooter } from "@/components/lesson/SectionFooter";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ lessonId: string; sectionId: string }>;
}) {
  const { lessonId, sectionId } = await params;
  const user = await getCurrentUser();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      sections: { orderBy: { order: "asc" } },
      videos: true,
      exercises: true,
      subject: { include: { course: true } },
    },
  });
  if (!lesson) notFound();

  const section = lesson.sections.find((s) => s.id === sectionId);
  if (!section) notFound();

  const course = lesson.subject.course;
  const sectionIndex = lesson.sections.findIndex((s) => s.id === sectionId);
  const prev = sectionIndex > 0 ? lesson.sections[sectionIndex - 1] : null;
  const next =
    sectionIndex < lesson.sections.length - 1
      ? lesson.sections[sectionIndex + 1]
      : null;

  const completed = await getCompletedSectionIds(
    user?.id,
    lesson.sections.map((s) => s.id)
  );
  const isDone = completed.has(sectionId);
  const nextHref = next
    ? `/lessons/${lessonId}/sections/${next.id}`
    : `/lessons/${lessonId}`;

  return (
    <div>
      <PageHeader title={section.title ?? lesson.title} />
      <Page className="mx-auto max-w-4xl py-5 sm:py-8">
        <Breadcrumbs
          items={[
            { label: course.title, href: `/courses/${course.id}` },
            { label: lesson.subject.title, href: `/subjects/${lesson.subjectId}` },
            { label: lesson.title, href: `/lessons/${lessonId}` },
            { label: `Step ${sectionIndex + 1}` },
          ]}
        />

        <SectionView
          section={section}
          videos={lesson.videos}
          exercises={lesson.exercises}
          courseId={course.id}
        />

        <SectionFooter
          sectionId={section.id}
          lessonId={lesson.id}
          nextHref={nextHref}
          completed={isDone}
        />

        <nav className="mt-4 flex justify-between gap-2">
              {prev ? (
                <Link
                  href={`/lessons/${lessonId}/sections/${prev.id}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={`/lessons/${lessonId}/sections/${next.id}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Link>
              ) : null}
            </nav>
      </Page>
    </div>
  );
}
