import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Page, PageTitle } from "@/components/layout/Page";
import { AssignmentRow } from "@/components/assignment/AssignmentRow";
import type { Assignment, Course } from "@prisma/client";

export const dynamic = "force-dynamic";

type WithCourse = Assignment & {
  course: Course;
  milestones: { completedAt: Date | null }[];
};

function Group({
  title,
  items,
}: {
  title: string;
  items: WithCourse[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="space-y-2.5">
        {items.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            courseTitle={a.course.title}
            milestones={a.milestones}
          />
        ))}
      </div>
    </section>
  );
}

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const assignments = await prisma.assignment.findMany({
    where: { userId: user.id, status: { not: "FAILED" } },
    include: {
      course: true,
      milestones: { select: { completedAt: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });

  const now = Date.now();
  const overdue = assignments.filter(
    (a) => !a.completedAt && a.dueAt && a.dueAt.getTime() < now
  );
  const upcoming = assignments.filter(
    (a) => !a.completedAt && (!a.dueAt || a.dueAt.getTime() >= now)
  );
  const done = assignments.filter((a) => a.completedAt);

  return (
    <Page>
      <PageTitle
        eyebrow="Coursework"
        title="Assignments"
        description="Practice sets, projects, and quizzes across your courses"
      />

      {assignments.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            No assignments yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Assignments are created automatically with each course — or generate
            your own from any course page.
          </p>
        </div>
      ) : (
        <>
          <Group title="Overdue" items={overdue} />
          <Group title="Up next" items={upcoming} />
          <Group title="Completed" items={done} />
        </>
      )}
    </Page>
  );
}
