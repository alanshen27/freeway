import {
  Dumbbell,
  Hammer,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { AssignmentType } from "@prisma/client";

export const ASSIGNMENT_META: Record<
  AssignmentType,
  { label: string; Icon: LucideIcon; color: string; bg: string }
> = {
  PRACTICE: {
    label: "Practice",
    Icon: Dumbbell,
    color: "text-sky",
    bg: "bg-sky-soft",
  },
  PROJECT: {
    label: "Project",
    Icon: Hammer,
    color: "text-brand-600",
    bg: "bg-brand-50",
  },
  QUIZ: {
    label: "Quiz",
    Icon: ListChecks,
    color: "text-mint",
    bg: "bg-mint-soft",
  },
};

export type DueInfo = { label: string; overdue: boolean };

/** Human due-date label: "Due today", "Due in 5 days", "Overdue by 2 days". */
export function dueInfo(
  dueAt: Date | string | null | undefined,
  completed: boolean
): DueInfo | null {
  if (!dueAt) return null;
  const d = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  if (completed) {
    return { label: `Was due ${d.toLocaleDateString()}`, overdue: false };
  }
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0)
    return {
      label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
      overdue: true,
    };
  if (days === 0) return { label: "Due today", overdue: false };
  if (days === 1) return { label: "Due tomorrow", overdue: false };
  if (days <= 14) return { label: `Due in ${days} days`, overdue: false };
  return { label: `Due ${d.toLocaleDateString()}`, overdue: false };
}
