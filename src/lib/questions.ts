import type { QuestionItem, QuestionMcqItem, QuestionOpenItem } from "@/lib/schemas";

export function isMcqQuestion(item: QuestionItem): item is QuestionMcqItem {
  return item.type !== "open" && "choices" in item;
}

export function isOpenQuestion(item: QuestionItem): item is QuestionOpenItem {
  return item.type === "open";
}

export function questionMarks(item: QuestionItem): number {
  return item.marks ?? 1;
}

export function sectionTotalMarks(items: QuestionItem[]): number {
  return items.reduce((sum, item) => sum + questionMarks(item), 0);
}
