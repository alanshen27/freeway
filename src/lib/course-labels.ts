/** Human-readable course category (e.g. MECHANICAL_ENGINEERING → Mechanical engineering). */
export function formatCategory(category: string): string {
  const words = category.toLowerCase().replace(/_/g, " ").split(/\s+/);
  if (words.length === 0) return category;
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Human-readable level (e.g. beginner → Beginner). */
export function formatLevel(level: string): string {
  if (!level) return level;
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

export type CourseCardStatus =
  | "generating"
  | "failed"
  | "not_started"
  | "in_progress"
  | "completed";

/** Learning status for course list cards (matches filter tabs). */
export function courseCardStatus(c: {
  status: string;
  progress: number;
  lessonsTotal: number;
}): CourseCardStatus {
  if (c.status === "GENERATING") return "generating";
  if (c.status === "FAILED") return "failed";
  if (c.lessonsTotal > 0 && c.progress === 100) return "completed";
  if (c.progress > 0) return "in_progress";
  return "not_started";
}

export const COURSE_CARD_STATUS_BADGE: Record<
  CourseCardStatus,
  { label: string; variant: "warn" | "danger" | "outline" | "primary" | "good" }
> = {
  generating: { label: "Generating", variant: "warn" },
  failed: { label: "Failed", variant: "danger" },
  not_started: { label: "Not started", variant: "outline" },
  in_progress: { label: "In progress", variant: "primary" },
  completed: { label: "Completed", variant: "good" },
};

/** List sort: in progress first, then not started, then completed. */
export function courseCardStatusSortOrder(status: CourseCardStatus): number {
  switch (status) {
    case "generating":
    case "in_progress":
      return 0;
    case "failed":
    case "not_started":
      return 1;
    case "completed":
      return 2;
  }
}

export function courseStatusLabel(status: string): string | null {
  switch (status) {
    case "READY":
      return null;
    case "GENERATING":
      return "Generating";
    case "FAILED":
      return "Failed";
    case "DRAFT":
      return "Draft";
    default:
      return formatLevel(status);
  }
}

/** Frosted pill for badges on the course hero (dark overlay). */
export const heroBadgeClass =
  "inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium text-white ring-1 ring-inset ring-white/25";
