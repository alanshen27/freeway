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
    color: "text-white",
    bg: "bg-blue-600",
  },
  VIDEO: {
    label: "Video",
    shortLabel: "Video",
    Icon: Video,
    color: "text-white",
    bg: "bg-violet-600",
  },
  WORKSHEET: {
    label: "Worksheet",
    shortLabel: "Sheet",
    Icon: ClipboardList,
    color: "text-white",
    bg: "bg-amber-600",
  },
  QUESTIONS: {
    label: "Review questions",
    shortLabel: "Quiz",
    Icon: CircleHelp,
    color: "text-white",
    bg: "bg-emerald-600",
  },
  EXERCISE: {
    label: "Exercise",
    shortLabel: "Practice",
    Icon: Puzzle,
    color: "text-white",
    bg: "bg-rose-600",
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
