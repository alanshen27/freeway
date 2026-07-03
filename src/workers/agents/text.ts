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
}): Promise<ReadingContent> {
  return llmJSON({
    task: "writeReadingSection",
    schema: readingSchema,
    system: READING_SYSTEM,
    prompt: `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.lessonTitle}
Goals: ${args.goals.join("; ")}

Return JSON { markdown, images: [{ slot: "IMAGE_0", prompt, alt, caption? }, ...] }.
Write 300-450 words. Include at least 2 images at meaningful points in the narrative.`,
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
      "You write practice worksheets in Markdown: numbered problems, short answer " +
      "prompts, and reflection questions. Optional diagrams via IMAGE_0 placeholders. " +
      "Use prompt for DALL·E image generation (instructional diagram, no text, centered, properly framed / scaled). JSON only.",
    prompt: `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.lessonTitle}

Return JSON { markdown, images: [...] }. 4-6 practice items. Use IMAGE_0 only if a diagram helps.`,
    mock: () => ({
      markdown: `## Worksheet: ${args.lessonTitle}\n\n1. Summarize the core idea in your own words.\n\n2. Apply the concept to a realistic scenario.\n\n3. What would you do differently on a second attempt?\n\n![Diagram](IMAGE_0)`,
      images: [
        {
          slot: "IMAGE_0",
          prompt: `Educational diagram explaining ${args.lessonTitle}, clean technical illustration, no text labels, centered, good framing, no cutoffs`,
          alt: "Concept diagram",
        },
      ],
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
