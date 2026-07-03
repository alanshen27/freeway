import { llmJSON, planCourseFallback } from "@/lib/llm";
import {
  scaleForCourse,
  scaleSummary,
} from "@/lib/course-scale";
import {
  courseBlueprintSchema,
  tasterCourseBlueprintSchema,
  type CourseBlueprint,
} from "@/lib/schemas";

type PlanInput = {
  topic: string;
  category: string;
  level: string;
  interests: string[];
  responses: { prompt: string; answer: string }[];
  durationWeeks?: number;
  isTaster?: boolean;
};

/**
 * Top-level orchestrator. Plans the course as a set of subjects (topic areas).
 * Each subject is expanded by a sub-orchestrator into lessons + sections.
 */
export async function planCourse(input: PlanInput): Promise<CourseBlueprint> {
  const responseText = input.responses
    .map((r) => `Q: ${r.prompt}\nA: ${r.answer}`)
    .join("\n");

  if (input.isTaster) {
    return llmJSON({
      task: "planCourse",
      fallback: planCourseFallback,
      schema: tasterCourseBlueprintSchema,
      system:
        "You are a curriculum architect for professional engineering education. " +
        "Design a short taster course that gives learners a compelling sample of a track. " +
        "Respond with strict JSON only.",
      prompt: `Design a taster course on "${input.topic}" (${input.category}, level ${input.level}).
Learner interests: ${input.interests.join(", ") || "general"}.
Preliminary answers:\n${responseText || "(none)"}

Return JSON: { title, summary, level, subjects: [{ title, summary, goals: string[] }] }.
Use exactly 1 subject with 2-3 concrete learning goals. Keep the scope small — this is a preview, not a full program.`,
      mock: () => mockTasterCourseBlueprint(input),
    });
  }

  const scale = scaleForCourse({
    durationWeeks: input.durationWeeks ?? 8,
    isTaster: false,
  });

  return llmJSON({
    task: "planCourse",
    fallback: planCourseFallback,
    schema: courseBlueprintSchema,
    system:
      "You are a curriculum architect for comprehensive professional engineering programs. " +
      "Design courses as sequential modules (subjects) that build from foundations to advanced practice. " +
      "Each module must be distinct — no duplicate titles. Respond with strict JSON only.",
    prompt: `Design a comprehensive course on "${input.topic}" (${input.category}, level ${input.level}).
Learner interests: ${input.interests.join(", ") || "general"}.
Duration: ${input.durationWeeks ?? 8} weeks.
Target size: ${scaleSummary(scale)}.
Preliminary answers:\n${responseText || "(none)"}

Return JSON: { title, summary, level, subjects: [{ title, summary, goals: string[] }] }.

Use EXACTLY ${scale.moduleCount} modules (subjects), in learning order from foundations to advanced.
Each module needs 3-5 concrete learning goals that fit its place in the sequence.
Cover the full breadth of ${input.topic} — split topics across modules rather than repeating.`,
    mock: () => mockCourseBlueprint(input, scale.moduleCount),
  });
}

function mockCourseBlueprint(input: PlanInput, moduleCount: number): CourseBlueprint {
  const t = input.topic;
  const subjects = Array.from({ length: moduleCount }, (_, i) => ({
    title: i === 0 ? "Foundations" : i === moduleCount - 1 ? "Advanced practice" : `Module ${i + 1}`,
    summary:
      i === 0
        ? `Core concepts behind ${t}.`
        : i === moduleCount - 1
          ? `Capstone-style practice with ${t}.`
          : `Intermediate topics in ${t} (part ${i + 1}).`,
    goals: [
      "Define key terms for this stage",
      "Apply methods to realistic problems",
      "Connect theory to practice",
      "Identify common pitfalls",
    ],
  }));

  return {
    title: t,
    summary: `A comprehensive program on ${t}.`,
    level: input.level,
    subjects,
  };
}

function mockTasterCourseBlueprint(input: PlanInput): CourseBlueprint {
  const t = input.topic;
  return {
    title: `${t} — Taster`,
    summary: `A quick sample of ${t} to see if this track fits you.`,
    level: input.level,
    subjects: [
      {
        title: `First taste of ${t}`,
        summary: `A compact introduction to the core ideas.`,
        goals: ["Grasp the main idea", "Try one hands-on exercise"],
      },
    ],
  };
}
