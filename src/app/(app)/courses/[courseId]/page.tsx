import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessagesSquare, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { RegenerateCourseButton } from "@/components/course/RegenerateCourseButton";
import { CoverImage } from "@/components/lesson/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Page, ListPanel, ListRow, Breadcrumbs } from "@/components/layout/Page";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      subjects: {
        orderBy: { order: "asc" },
        include: { _count: { select: { lessons: true } } },
      },
    },
  });
  if (!course) notFound();

  return (
    <div>
      <PageHeader
        title={course.title}
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
          </div>
        }
      />

      <Page wide>
        <Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: course.title }]} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="primary">{course.level}</Badge>
          <Badge variant="outline">{course.category.replace(/_/g, " ")}</Badge>
          {course.status !== "READY" && (
            <Badge variant="warn">{course.status.toLowerCase()}</Badge>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{course.summary}</p>

        {course.status === "GENERATING" && (
          <p className="mt-4 text-sm text-muted-foreground">
            This course is still being generated. Check back shortly.
          </p>
        )}

        {course.status === "FAILED" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-blush/30 bg-blush-soft px-4 py-3">
            <p className="flex-1 text-sm text-blush">
              Generation didn&apos;t finish. Use Regenerate to run it again.
            </p>
            <RegenerateCourseButton courseId={course.id} />
          </div>
        )}

        {course.subjects.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subjects
            </h2>
            <ListPanel flat>
              {course.subjects.map((s) => (
                <ListRow key={s.id} href={`/subjects/${s.id}`}>
                  {s.imageUrl ? (
                    <CoverImage
                      src={s.imageUrl}
                      alt={s.title}
                      className="size-12 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                      <BookOpen className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium">{s.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s._count.lessons} lessons
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </ListRow>
              ))}
            </ListPanel>
          </section>
        )}
      </Page>
    </div>
  );
}
