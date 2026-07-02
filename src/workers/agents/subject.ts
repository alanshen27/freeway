import { llmJSON } from "@/lib/llm";
import {
  subjectBlueprintSchema,
  tasterSubjectBlueprintSchema,
  type SubjectBlueprint,
} from "@/lib/schemas";

type PlanInput = {
  courseTitle: string;
  subjectTitle: string;
  subjectSummary: string;
  goals: string[];
  category: string;
  level: string;
  isTaster?: boolean;
};

/**
 * Subject sub-orchestrator. Plans a few rich lessons (4–5 sections each):
 * intro reading/video → worksheets → supplemental reading/video → more worksheets.
 */
export async function planSubjectLessons(input: PlanInput): Promise<SubjectBlueprint> {
  if (input.isTaster) {
    return llmJSON({
      task: "planSubjectLessons",
      schema: tasterSubjectBlueprintSchema,
      system:
        "You plan a short taster lesson for a professional LMS. Keep it compact but engaging. " +
        "Respond with strict JSON only.",
      prompt: `Course: ${input.courseTitle}
Subject: ${input.subjectTitle} — ${input.subjectSummary}
Goals: ${input.goals.join("; ")}
Category: ${input.category}, level: ${input.level}

Return JSON: { lessons: [{ title, summary, sections: [{ type, title?, exerciseType? }] }] }.

Use exactly 1 lesson with 3-4 sections. Typical flow:
1. READING or VIDEO — hook the learner with the core idea
2. WORKSHEET — one short guided practice
3. QUESTIONS or EXERCISE — quick check or hands-on challenge

Keep it lightweight — this is a taster, not a full module.`,
      mock: () => mockTasterSubjectBlueprint(input),
    });
  }

  return llmJSON({
    task: "planSubjectLessons",
    schema: subjectBlueprintSchema,
    system:
      "You plan lessons for a professional LMS. Each lesson is a multi-step module with " +
      "4–5 sections. Build depth through worksheets and short supplemental readings or videos. " +
      "Respond with strict JSON only.",
    prompt: `Course: ${input.courseTitle}
Subject: ${input.subjectTitle} — ${input.subjectSummary}
Goals: ${input.goals.join("; ")}
Category: ${input.category}, level: ${input.level}

Return JSON: { lessons: [{ title, summary, sections: [{ type, title?, exerciseType? }] }] }.

Use 2–4 lessons per subject. Each lesson has 4–5 sections (sections array length 4 or 5).

Typical section flow inside a lesson:
1. READING or VIDEO — introduce the topic for this lesson
2. WORKSHEET — guided practice
3. WORKSHEET — applied problems (different scenario)
4. READING or VIDEO — supplemental explanation, edge cases, or worked example
5. WORKSHEET, QUESTIONS, or EXERCISE — consolidation (pick one for the last step)

Rules:
- Include at least two WORKSHEET sections per lesson.
- Alternate worksheets with short READING or VIDEO supplements — do not stack 4 worksheets with no media.
- Use QUESTIONS for quick review; use EXERCISE (with exerciseType) for hands-on challenges.
- Spread EXERCISE across lessons sparingly (not every lesson needs one).
For EXERCISE sections set exerciseType from: CODING, CIRCUIT, VISUAL, MCQ, GRADED_TEXT, ORDERING, FILL_BLANK, MATCHING, NUMERIC, FLASHCARDS, CATEGORIZE, CODE_OUTPUT, LOGIC_CIRCUIT, GEOMETRY, FREE_BODY.
Prefer variety: NUMERIC for calculation-heavy topics, CODE_OUTPUT for programming topics, FLASHCARDS for terminology, CATEGORIZE for classification/taxonomy topics.
Prefer the builder types where the domain fits: LOGIC_CIRCUIT for digital logic / boolean algebra / CS fundamentals, GEOMETRY for geometry / trigonometry / vectors / spatial math, FREE_BODY for mechanics, statics and physics force problems.`,
    mock: () => mockSubjectBlueprint(input),
  });
}

function mockSubjectBlueprint(input: PlanInput): SubjectBlueprint {
  const ex =
    input.category === "SOFTWARE_ENGINEERING" || input.category === "AI_ENGINEERING"
      ? "CODING"
      : input.category === "MECHANICAL_ENGINEERING" || input.category === "PHYSICS"
        ? "VISUAL"
        : "MCQ";

  return {
    lessons: [
      {
        title: `Foundations: ${input.subjectTitle}`,
        summary: `Core ideas and first practice for ${input.subjectTitle}.`,
        sections: [
          { type: "READING", title: "Concept overview" },
          { type: "WORKSHEET", title: "Warm-up problems" },
          { type: "WORKSHEET", title: "Guided practice" },
          { type: "VIDEO", title: "Worked examples" },
          { type: "QUESTIONS", title: "Quick check" },
        ],
      },
      {
        title: `Applied: ${input.subjectTitle}`,
        summary: "Deeper practice with supplemental explanation.",
        sections: [
          { type: "VIDEO", title: "Technique walkthrough" },
          { type: "WORKSHEET", title: "Scenario A" },
          { type: "READING", title: "Supplemental notes" },
          { type: "WORKSHEET", title: "Scenario B" },
          { type: "EXERCISE", title: "Challenge", exerciseType: ex as "CODING" },
        ],
      },
    ],
  };
}

function mockTasterSubjectBlueprint(input: PlanInput): SubjectBlueprint {
  const ex =
    input.category === "SOFTWARE_ENGINEERING" || input.category === "AI_ENGINEERING"
      ? "CODING"
      : "MCQ";

  return {
    lessons: [
      {
        title: `Sample: ${input.subjectTitle}`,
        summary: `A quick introduction to ${input.subjectTitle}.`,
        sections: [
          { type: "READING", title: "Core idea" },
          { type: "WORKSHEET", title: "Try it yourself" },
          { type: "EXERCISE", title: "Quick challenge", exerciseType: ex as "CODING" },
        ],
      },
    ],
  };
}
