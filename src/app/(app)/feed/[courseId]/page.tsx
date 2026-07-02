import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo, initials } from "@/lib/utils";
import { Page, ListPanel, ListRow } from "@/components/layout/Page";

export const dynamic = "force-dynamic";

export default async function CourseForumPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      threads: {
        include: { author: true, exercise: true, _count: { select: { posts: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!course) notFound();

  return (
    <div>
      <PageHeader
        title={course.title}
        eyebrow="Forum"
        backHref="/feed"
        action={
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={`/feed/${courseId}/new`}>
              <Plus className="size-4" />
              New
            </Link>
          </Button>
        }
      />
      <Page>
        <Button asChild size="sm" className="mb-4 sm:hidden">
          <Link href={`/feed/${courseId}/new`}>
            <Plus className="size-4" />
            New discussion
          </Link>
        </Button>

        <div className="mt-6">
          {course.threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No discussions yet. Start the first thread for this course.
            </p>
          ) : (
            <ListPanel>
              {course.threads.map((t) => (
                <ListRow key={t.id} href={`/feed/${courseId}/thread/${t.id}`}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-medium text-brand-700">
                    {initials(t.author.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t.author.name} · {timeAgo(t.createdAt)}
                      </span>
                      {t.exercise && (
                        <Badge variant="outline">Exercise ref</Badge>
                      )}
                    </div>
                    <h3 className="mt-0.5 text-sm font-medium">{t.title}</h3>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {t.body}
                    </p>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {t._count.posts} replies
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </ListRow>
              ))}
            </ListPanel>
          )}
        </div>
      </Page>
    </div>
  );
}
