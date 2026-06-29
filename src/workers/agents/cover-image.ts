import { z } from "zod";
import { llmJSON } from "@/lib/llm";
import { generateImage } from "@/lib/image-gen";
import { findStockImage } from "@/lib/serp";
import { features } from "@/lib/env";

const promptSchema = z.object({
  prompt: z.string().max(1000),
});

async function imagePrompt(
  system: string,
  user: string,
  mock: string
): Promise<string> {
  const { prompt } = await llmJSON({
    schema: promptSchema,
    system,
    prompt: user,
    mock: () => ({ prompt: mock }),
  });
  return prompt;
}

/** Hero image for a course card. */
export async function generateCourseImage(args: {
  id: string;
  title: string;
  summary: string;
  category: string;
}): Promise<string | null> {
  const prompt = await imagePrompt(
    "You write image prompts for professional online course cover art. " +
      "Clean, modern, educational illustration. No text in the image. JSON only.",
    `Course: ${args.title}
Summary: ${args.summary}
Field: ${args.category}

Return JSON { prompt: string } — one striking scene representing this entire course.`,
    `Professional course cover illustration for ${args.title}, modern educational style, no text`
  );

  return (
    (await generateImage(prompt, `course-${args.id}`)) ??
    (features.serp ? await findStockImage(args.title) : null)
  );
}

/** Hero image for a subject (unit) module. */
export async function generateSubjectImage(args: {
  id: string;
  courseTitle: string;
  title: string;
  summary: string;
  goals: string[];
  category: string;
}): Promise<string | null> {
  const prompt = await imagePrompt(
    "You write DALL·E image prompts for professional LMS module cover art. " +
      "Clean, modern, educational illustration style. No text in the image. JSON only.",
    `Course: ${args.courseTitle}
Subject (module): ${args.title}
Summary: ${args.summary}
Goals: ${args.goals.join("; ")}
Field: ${args.category}

Return JSON { prompt: string } — one vivid scene that represents this subject.`,
    `Professional educational illustration about ${args.title}, modern flat design, indigo accents, no text`
  );

  return (
    (await generateImage(prompt, `subject-${args.id}`)) ??
    (features.serp ? await findStockImage(args.title) : null)
  );
}

/** Cover image for an individual lesson step. */
export async function generateLessonImage(args: {
  id: string;
  courseTitle: string;
  subjectTitle: string;
  title: string;
  summary: string;
  category: string;
}): Promise<string | null> {
  const prompt = await imagePrompt(
    "You write DALL·E image prompts for lesson thumbnails in a corporate LMS. " +
      "Clear focal subject, instructional feel, no text overlays. JSON only.",
    `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.title}
Summary: ${args.summary}
Field: ${args.category}

Return JSON { prompt: string } — a single scene illustrating this lesson.`,
    `Lesson illustration for ${args.title}, clean technical diagram style, no text`
  );

  return (
    (await generateImage(prompt, `lesson-${args.id}`)) ??
    (features.serp ? await findStockImage(args.title) : null)
  );
}
