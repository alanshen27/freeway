import {
  BookOpen,
  GraduationCap,
  Layers,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { ASSIGNMENT_META } from "@/lib/assignment-meta";
import { SECTION_META, isSectionTypeKey } from "@/lib/section-types";
import type { SearchResultItem } from "@/lib/global-search";

/** Row background — mirrors course modules, assignments, etc. */
export function searchResultRowBg(item: SearchResultItem): string {
  switch (item.type) {
    case "course":
      if (item.courseStatus === "completed") return "bg-green-100";
      if (item.courseStatus === "generating") return "bg-amber-100";
      return "bg-white";
    case "assignment":
      return item.assignmentCompleted ? "bg-green-100" : "bg-white";
    case "subject":
      return item.moduleComplete ? "bg-green-100" : "bg-white";
    case "lesson":
      return item.lessonComplete ? "bg-green-100" : "bg-white";
    case "section":
      return item.sectionComplete ? "bg-green-100" : "bg-white";
    case "forum":
      return "bg-white";
  }
}

/** True when the row uses the completed green background. */
export function searchResultIsComplete(item: SearchResultItem): boolean {
  return searchResultRowBg(item) === "bg-green-100";
}

export function searchResultIconStyle(item: SearchResultItem): {
  Icon: LucideIcon;
  bg: string;
  color: string;
} {
  if (item.type === "assignment" && item.assignmentType) {
    const meta = ASSIGNMENT_META[item.assignmentType];
    return { Icon: meta.Icon, bg: meta.bg, color: meta.color };
  }

  if (item.type === "section" && item.sectionType && isSectionTypeKey(item.sectionType)) {
    const meta = SECTION_META[item.sectionType];
    return { Icon: meta.Icon, bg: meta.bg, color: meta.color };
  }

  switch (item.type) {
    case "course":
      return { Icon: BookOpen, bg: "bg-brand-50", color: "text-brand-600" };
    case "subject":
      return { Icon: Layers, bg: "bg-brand-50", color: "text-brand-600" };
    case "lesson":
      return { Icon: GraduationCap, bg: "bg-brand-50", color: "text-brand-600" };
    case "forum":
      return { Icon: MessagesSquare, bg: "bg-brand-50", color: "text-brand-700" };
    default:
      return { Icon: BookOpen, bg: "bg-secondary", color: "text-muted-foreground" };
  }
}
