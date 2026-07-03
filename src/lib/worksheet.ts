import type { WorksheetSectionData } from "@/lib/schemas";

export type WorksheetItem = { prompt: string; hint?: string };

/** Parse legacy worksheet markdown into intro + numbered problems. */
export function parseWorksheetMarkdown(markdown: string): {
  intro: string;
  items: WorksheetItem[];
} {
  const items: WorksheetItem[] = [];
  const introParts: string[] = [];
  const chunks = markdown.split(/\n(?=\d+\.\s)/);

  for (const chunk of chunks) {
    const match = chunk.match(/^(\d+\.\s+)([\s\S]*)$/);
    if (match) {
      items.push({ prompt: match[2].trim() });
    } else if (chunk.trim()) {
      introParts.push(chunk.trim());
    }
  }

  return { intro: introParts.join("\n\n").trim(), items };
}

export function resolveWorksheetContent(data: WorksheetSectionData): {
  intro: string;
  items: WorksheetItem[];
} {
  if (data.items?.length) {
    return {
      intro: data.intro ?? data.markdown ?? "",
      items: data.items,
    };
  }
  return parseWorksheetMarkdown(data.markdown ?? data.intro ?? "");
}
