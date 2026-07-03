import { llmJSON } from "@/lib/llm";
import { readingSchema, worksheetSchema, type ReadingContent, type WorksheetContent } from "@/lib/schemas";

const READING_SYSTEM =
  "You write professional LMS reading documents in Markdown. Use headings, short " +
  "paragraphs, bullet lists, and blockquotes. Embed 2-5 images using placeholders " +
  "IMAGE_0, IMAGE_1, etc. on their own lines like: ![alt text](IMAGE_0). " +
  "Each image needs a matching entry in the images array with the same slot. " +
  "For each image, write a detailed DALL·E prompt in the prompt field (educational " +
  "illustration, diagram, or photo-style — no text in the image). Make sure that each " +
  "image is centered, clear, properly framed / scaled, and not cut off by adding " +
  "parameters to the prompt. Respond with strict JSON.";

export async function writeReadingSection(args: {
  courseTitle: string;
  subjectTitle: string;
  lessonTitle: string;
  goals: string[];
  isTaster?: boolean;
}): Promise<ReadingContent> {
  const words = args.isTaster ? "300-450" : "700-1000";
  return llmJSON({
    task: "writeReadingSection",
    schema: readingSchema,
    system: READING_SYSTEM,
    prompt: `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.lessonTitle}
Goals: ${args.goals.join("; ")}

Return JSON { markdown, images: [{ slot: "IMAGE_0", prompt, alt, caption? }, ...] }.
Write ${words} words. Include 3-5 images at meaningful points. Use headings, examples, and a summary.`,
    mock: () => mockReading(args),
  });
}

export async function writeWorksheetSection(args: {
  courseTitle: string;
  subjectTitle: string;
  lessonTitle: string;
  goals: string[];
}): Promise<WorksheetContent> {
  return llmJSON({
    task: "writeWorksheetSection",
    schema: worksheetSchema,
    system:
      "You write practice worksheets as structured JSON: a short intro in Markdown " +
      "(optional heading, no numbered problems in intro) plus 4-6 items with prompt " +
      "and optional hint. Each item is one clear short-answer or show-your-work problem. " +
      "Optional diagrams via IMAGE_0 in intro only. Use prompt for DALL·E (instructional " +
      "diagram, no text, centered). JSON only.",
    prompt: `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.lessonTitle}
Goals: ${args.goals.join("; ")}

Return JSON { intro, items: [{ prompt, hint? }], images: [...] }. 6-8 practice items. Use IMAGE_0 only if a diagram helps.`,
    mock: () => ({
      intro: `## Worksheet: ${args.lessonTitle}\n\nWork through each problem below. Show reasoning where asked.`,
      items: [
        { prompt: "Summarize the core idea from this lesson in your own words." },
        {
          prompt: "Apply the concept to a realistic scenario from your field.",
          hint: "Name the scenario and walk through your reasoning step by step.",
        },
        {
          prompt: "What is one common mistake learners make here, and how would you avoid it?",
        },
        { prompt: "Create a mini example (with numbers or a sketch description) that demonstrates the method." },
      ],
      images: [],
    }),
  });
}

function mockReading(args: {
  lessonTitle: string;
  subjectTitle: string;
  goals: string[];
}): ReadingContent {
  return {
    markdown: `## ${args.lessonTitle}\n\nThis reading introduces **${args.subjectTitle}** with a focus on ${args.goals[0] ?? "core ideas"}.\n\n![Overview](IMAGE_0)\n\n### Key points\n\n- Build intuition before formulas\n- Connect each idea to a real artifact\n- Practice immediately after reading\n\n> Professional tip: sketch the system before calculating.\n\n![Example](IMAGE_1)`,
    images: [
      {
        slot: "IMAGE_0",
        prompt: `Overview illustration for ${args.lessonTitle}, modern educational style, indigo palette, centered, good framing, no cutoffs`,
        alt: "Topic overview",
        caption: "High-level view",
      },
      {
        slot: "IMAGE_1",
        prompt: `Worked example diagram for ${args.lessonTitle}, technical schematic, no text, centered, good framing, no cutoffs`,
        alt: "Worked example",
      },
    ],
  };
}
