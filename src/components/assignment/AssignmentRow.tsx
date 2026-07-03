import Link from "next/link";
import { CheckCircle2, ChevronRight, CalendarDays } from "lucide-react";
import type { Assignment } from "@prisma/client";
import { ASSIGNMENT_META, dueInfo } from "@/lib/assignment-meta";
import { assignmentQuizMarks, assignmentMilestoneMarks } from "@/lib/quiz-marks";
import { cn } from "@/lib/utils";

export function AssignmentRow({
  assignment,
  courseTitle,
  milestones = [],
}: {
  assignment: Assignment;
  courseTitle?: string;
  milestones?: { completedAt: Date | null }[];
}) {
  const meta = ASSIGNMENT_META[assignment.type];
  const completed = assignment.completedAt !== null;
  const due = dueInfo(assignment.dueAt, completed);
  const marks = assignmentQuizMarks(assignment) ?? assignmentMilestoneMarks(assignment, milestones);

  return (
    <Link
      href={`/assignments/${assignment.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border p-3.5 shadow-card transition-all hover:border-brand-100 hover:shadow-md",
        completed ? "bg-green-100" : "bg-white"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          meta.bg
        )}
      >
        <meta.Icon className={cn("size-5", meta.color)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {meta.label}
            {courseTitle ? ` · ${courseTitle}` : ""}
          </span>
          {completed && <CheckCircle2 className="size-3.5 text-mint" />}
          {marks && (
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {marks}
            </span>
          )}
        </div>
        <h3
          className={cn(
            "mt-0.5 truncate text-sm font-medium",
            completed ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {assignment.status === "GENERATING" ? "Generating…" : assignment.title}
        </h3>
        {due && (
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-xs",
              due.overdue ? "font-medium text-blush" : "text-muted-foreground"
            )}
          >
            <CalendarDays className="size-3" />
            {due.label}
          </p>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
