import { notFound, redirect } from "next/navigation";
import { CheckCircle2, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ASSIGNMENT_META, dueInfo } from "@/lib/assignment-meta";
import type { AssignmentQuizData, AssignmentChatMessage } from "@/lib/schemas";
import { PageHeader } from "@/components/PageHeader";
import { Page, Breadcrumbs } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";
import { MilestoneList } from "@/components/assignment/MilestoneList";
import { QuizPlayer } from "@/components/assignment/QuizPlayer";
import { AssistantPanel } from "@/components/assignment/AssistantPanel";
import { CompleteButton } from "@/components/assignment/CompleteButton";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: true,
      milestones: { orderBy: { order: "asc" } },
    },
  });
  if (!assignment || assignment.userId !== user.id) notFound();

  const meta = ASSIGNMENT_META[assignment.type];
  const completed = assignment.completedAt !== null;
  const due = dueInfo(assignment.dueAt, completed);
  const quizData =
    assignment.type === "QUIZ"
      ? (assignment.data as AssignmentQuizData | null)
      : null;
  const chatLog = (assignment.chatLog as AssignmentChatMessage[]) ?? [];

  return (
    <div>
      <PageHeader
        title={assignment.title}
        eyebrow={meta.label}
        backHref={`/courses/${assignment.courseId}`}
        action={
          assignment.status === "READY" ? (
            <CompleteButton assignmentId={assignment.id} completed={completed} />
          ) : undefined
        }
      />

      <Page>
        <Breadcrumbs
          items={[
            { label: "Courses", href: "/courses" },
            { label: assignment.course.title, href: `/courses/${assignment.courseId}` },
            { label: assignment.title },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" className={cn(meta.bg, meta.color, "ring-0")}>
            <meta.Icon className="size-3" />
            {meta.label}
          </Badge>
          {due && (
            <Badge variant={due.overdue ? "danger" : "outline"}>
              <CalendarDays className="size-3" />
              {due.label}
            </Badge>
          )}
          {completed && (
            <Badge variant="good">
              <CheckCircle2 className="size-3" />
              Completed
            </Badge>
          )}
          {assignment.status === "FAILED" && (
            <Badge variant="danger">Generation failed</Badge>
          )}
        </div>

        {assignment.status === "GENERATING" && (
          <p className="mt-6 text-sm text-muted-foreground">
            This assignment is still being generated. Check back in a moment.
          </p>
        )}

        {assignment.status === "READY" && (
          <>
            <section className="mt-6">
              <Markdown source={assignment.instructions} />
            </section>

            {assignment.milestones.length > 0 && (
              <div className="mt-8">
                <MilestoneList
                  assignmentId={assignment.id}
                  milestones={assignment.milestones.map((m) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    dueAt: m.dueAt?.toISOString() ?? null,
                    completedAt: m.completedAt?.toISOString() ?? null,
                  }))}
                />
              </div>
            )}

            {quizData?.items?.length ? (
              <div className="mt-8">
                <QuizPlayer assignmentId={assignment.id} data={quizData} />
              </div>
            ) : null}

            <div className="mt-8">
              <AssistantPanel
                assignmentId={assignment.id}
                initialMessages={chatLog}
              />
            </div>
          </>
        )}
      </Page>
    </div>
  );
}
