import { llmJSON } from "@/lib/llm";
import { exerciseSchema, type ExerciseSpec } from "@/lib/schemas";

type ExType =
  | "CODING"
  | "CIRCUIT"
  | "VISUAL"
  | "MCQ"
  | "GRADED_TEXT"
  | "ORDERING"
  | "FILL_BLANK"
  | "MATCHING";

const typeInstructions: Record<ExType, string> = {
  CODING:
    'config: { language:"javascript", functionName, starterCode, tests:[{args:[],expected}], hints:[] }. The tests call functionName(...args) and compare to expected.',
  CIRCUIT:
    "config: { goal, targetResistance (ohms), tolerance, palette:[{label,ohms}] }. Learner drags resistors to hit the target equivalent resistance.",
  VISUAL:
    'config: { kind:"vector-sum"|"lever"|"projectile"|"gear-ratio", target:{...numbers}, prompt }. vector-sum target {x,y}; lever solution {distance}; projectile target {distance}; gear-ratio target {ratio}.',
  MCQ: "config: { choices:string[], answerIndex, explanation }.",
  GRADED_TEXT:
    "config: { rubric:string[], minWords }. A short written answer graded by the model against the rubric.",
  ORDERING:
    "config: { items:string[] } listing the steps in the CORRECT order (UI shuffles them).",
  FILL_BLANK:
    'config: { template:"... ___ ... ___", answers:string[] } where each ___ is filled by the matching answer in order.',
  MATCHING:
    "config: { left:string[], right:string[], pairs:number[] } where pairs[i] is the index in right that matches left[i].",
};

/** Subagent: generates one interactive exercise of the requested type. */
export async function writeExercise(args: {
  type: ExType;
  courseTitle: string;
  lessonTitle: string;
  concepts: string[];
}): Promise<ExerciseSpec & { type: ExType }> {
  const fallback = mockExercise(args.type, args.lessonTitle);
  const spec = await llmJSON({
    schema: exerciseSchema,
    system:
      "You design a single self-contained, auto-checkable interactive exercise. " +
      "Output strict JSON. The prompt field must be plain text only — no markdown, " +
      "no backticks, no **bold**, no code fences. Use line breaks and simple dashes for lists. " +
      typeInstructions[args.type],
    prompt: `Type: ${args.type}\nCourse: ${args.courseTitle}\nLesson: ${args.lessonTitle}\nConcepts: ${args.concepts.join(", ")}\n
Return JSON { title, prompt, difficulty, config, solution? }.
config is mandatory — follow the shape for ${args.type} exactly.
prompt must be plain English instructions (no markdown formatting).`,
    mock: () => fallback,
  });

  const config =
    spec.config &&
    typeof spec.config === "object" &&
    !Array.isArray(spec.config) &&
    Object.keys(spec.config).length > 0
      ? spec.config
      : fallback.config;

  return {
    title: spec.title?.trim() || fallback.title,
    prompt: spec.prompt?.trim() || fallback.prompt,
    difficulty: spec.difficulty || fallback.difficulty,
    config,
    solution: spec.solution ?? fallback.solution,
    type: args.type,
  };
}

function mockExercise(type: ExType, lessonTitle: string): ExerciseSpec {
  switch (type) {
    case "CODING":
      return {
        title: `Implement: sum of a list`,
        prompt:
          "Complete `sumList(nums)` so it returns the sum of the array. This warm-up checks your environment works.",
        difficulty: "intro",
        config: {
          language: "javascript",
          functionName: "sumList",
          starterCode:
            "function sumList(nums) {\n  // TODO: return the sum\n  return 0;\n}",
          tests: [
            { args: [[1, 2, 3]], expected: 6 },
            { args: [[]], expected: 0 },
            { args: [[-1, 1, 10]], expected: 10 },
          ],
          hints: ["Use reduce or a for-loop.", "Start the accumulator at 0."],
        },
        solution: {
          code: "function sumList(nums){return nums.reduce((a,b)=>a+b,0);}",
        },
      };
    case "CIRCUIT":
      return {
        title: "Hit the target resistance",
        prompt:
          "Drag resistors into the series slot until the equivalent resistance is 150Ω (±0.5).",
        difficulty: "intro",
        config: {
          goal: "Reach 150Ω equivalent series resistance",
          targetResistance: 150,
          tolerance: 0.5,
          palette: [
            { label: "47Ω", ohms: 47 },
            { label: "56Ω", ohms: 56 },
            { label: "47Ω", ohms: 47 },
            { label: "100Ω", ohms: 100 },
          ],
        },
        solution: { combo: [47, 56, 47] },
      };
    case "VISUAL":
      return {
        title: "Balance the lever",
        prompt:
          "Place the 4kg mass so the beam balances. Torque must be equal on both sides.",
        difficulty: "intro",
        config: {
          kind: "lever",
          target: { torque: 12 },
          prompt: "Left side: 6kg at 2m. Balance it on the right with 4kg.",
        },
        solution: { distance: 3 },
      };
    case "GRADED_TEXT":
      return {
        title: `Explain it in your own words`,
        prompt: `In 60+ words, explain the core idea of "${lessonTitle}" as if teaching a friend.`,
        difficulty: "intro",
        config: {
          rubric: [
            "Mentions the core concept clearly",
            "Uses an analogy or example",
            "Is internally consistent",
          ],
          minWords: 60,
        },
        solution: null,
      };
    case "ORDERING":
      return {
        title: "Order the build steps",
        prompt: "Drag the steps into the correct order, then check.",
        difficulty: "intro",
        config: {
          items: [
            "Understand the problem",
            "Sketch a solution",
            "Implement the core",
            "Test and refine",
          ],
        },
        solution: null,
      };
    case "FILL_BLANK":
      return {
        title: "Complete the statement",
        prompt: "Fill in the blanks.",
        difficulty: "intro",
        config: {
          template: "Good engineering favors ___ over premature ___.",
          answers: ["clarity", "optimization"],
        },
        solution: null,
      };
    case "MATCHING":
      return {
        title: "Match the pairs",
        prompt: "Match each term to its definition.",
        difficulty: "intro",
        config: {
          left: ["Variable", "Function", "Loop"],
          right: [
            "A named storage slot",
            "A reusable block of logic",
            "Repeats work until a condition",
          ],
          pairs: [0, 1, 2],
        },
        solution: null,
      };
    case "MCQ":
    default:
      return {
        title: `Quick check: ${lessonTitle}`,
        prompt: `Which statement about ${lessonTitle} is most accurate?`,
        difficulty: "intro",
        config: {
          choices: [
            "It builds intuition before formalism.",
            "It can only be memorized.",
            "It has no real-world use.",
          ],
          answerIndex: 0,
          explanation:
            "Intuition-first learning makes the formal version much easier to retain.",
        },
        solution: { answerIndex: 0 },
      };
  }
}
