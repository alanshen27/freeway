import Link from "next/link";
import { CheckCircle2, ChevronRight, CalendarDays } from "lucide-react";
import type { Assignment } from "@prisma/client";
import { ASSIGNMENT_META, dueInfo } from "@/lib/assignment-meta";
import { cn } from "@/lib/utils";

export function AssignmentRow({
  assignment,
  courseTitle,
}: {
  assignment: Assignment;
  courseTitle?: string;
}) {
  const meta = ASSIGNMENT_META[assignment.type];
  const completed = assignment.completedAt !== null;
  const due = dueInfo(assignment.dueAt, completed);

  return (
    <Link
      href={`/assignments/${assignment.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-white p-3.5 shadow-card transition-all hover:border-brand-100 hover:shadow-md"
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
