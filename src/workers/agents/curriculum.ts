import { llmJSON } from "@/lib/llm";
import { courseBlueprintSchema, type CourseBlueprint } from "@/lib/schemas";

type PlanInput = {
  topic: string;
  category: string;
  level: string;
  interests: string[];
  responses: { prompt: string; answer: string }[];
};

/**
 * Top-level orchestrator. Plans the course as a set of subjects (topic areas).
 * Each subject is expanded by a sub-orchestrator into lessons + sections.
 */
export async function planCourse(input: PlanInput): Promise<CourseBlueprint> {
  const responseText = input.responses
    .map((r) => `Q: ${r.prompt}\nA: ${r.answer}`)
    .join("\n");

  return llmJSON({
    schema: courseBlueprintSchema,
    system:
      "You are a curriculum architect for professional engineering education. " +
      "Design courses as clear subject areas (modules), each with learning goals. " +
      "Respond with strict JSON only.",
    prompt: `Design a course on "${input.topic}" (${input.category}, level ${input.level}).
Learner interests: ${input.interests.join(", ") || "general"}.
Preliminary answers:\n${responseText || "(none)"}

Return JSON: { title, summary, level, subjects: [{ title, summary, goals: string[] }] }.
Use 2-4 subjects that build on each other. Each subject needs 2-4 concrete learning goals.`,
    mock: () => mockCourseBlueprint(input),
  });
}

function mockCourseBlueprint(input: PlanInput): CourseBlueprint {
  const t = input.topic;
  return {
    title: t,
    summary: `A structured introduction to ${t}.`,
    level: input.level,
    subjects: [
      {
        title: `Core concepts`,
        summary: `Foundational ideas behind ${t}.`,
        goals: ["Define key terms", "Explain the main mental model", "Connect theory to practice"],
      },
      {
        title: `Applied practice`,
        summary: `Hands-on work with ${t}.`,
        goals: ["Complete guided exercises", "Solve realistic problems", "Reflect on trade-offs"],
      },
    ],
  };
}
