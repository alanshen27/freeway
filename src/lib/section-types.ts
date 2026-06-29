import {
  BookOpen,
  Video,
  ClipboardList,
  CircleHelp,
  Puzzle,
  type LucideIcon,
} from "lucide-react";

export type SectionTypeKey =
  | "READING"
  | "VIDEO"
  | "WORKSHEET"
  | "QUESTIONS"
  | "EXERCISE";

export const SECTION_META: Record<
  SectionTypeKey,
  { label: string; shortLabel: string; Icon: LucideIcon; color: string; bg: string }
> = {
  READING: {
    label: "Reading",
    shortLabel: "Read",
    Icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  VIDEO: {
    label: "Video",
    shortLabel: "Video",
    Icon: Video,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  WORKSHEET: {
    label: "Worksheet",
    shortLabel: "Sheet",
    Icon: ClipboardList,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  QUESTIONS: {
    label: "Review questions",
    shortLabel: "Quiz",
    Icon: CircleHelp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  EXERCISE: {
    label: "Exercise",
    shortLabel: "Practice",
    Icon: Puzzle,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
};

export function isSectionTypeKey(t: string): t is SectionTypeKey {
  return t in SECTION_META;
}

/** Unique section types in first-seen order. */
export function orderedSectionTypes(types: string[]): SectionTypeKey[] {
  const seen = new Set<string>();
  const out: SectionTypeKey[] = [];
  for (const t of types) {
    if (!seen.has(t) && isSectionTypeKey(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
