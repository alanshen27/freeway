import { llmJSON } from "@/lib/llm";
import {
  ALL_EXERCISE_TYPES,
  exerciseTypesForLesson,
  scaleForCourse,
  type CourseScale,
} from "@/lib/course-scale";
import {
  subjectBlueprintSchema,
  tasterSubjectBlueprintSchema,
  type SubjectBlueprint,
} from "@/lib/schemas";

type SectionPlanItem = SubjectBlueprint["lessons"][number]["sections"][number];

/** Per-lesson section quota from the 12-step template, in backfill priority order. */
const SECTION_QUOTA: [SectionPlanItem["type"], number][] = [
  ["EXERCISE", 3],
  ["QUESTIONS", 2],
  ["WORKSHEET", 3],
  ["READING", 2],
  ["VIDEO", 2],
];

const BACKFILL_TITLES: Record<SectionPlanItem["type"], string> = {
  EXERCISE: "Hands-on challenge",
  QUESTIONS: "Checkpoint questions",
  WORKSHEET: "Extra practice",
  READING: "Further reading",
  VIDEO: "Recap video",
};

/**
 * The planner LLM sometimes returns fewer sections than the 12-step template
 * (the schema tolerates as few as 3) or omits exerciseType. Every planned exercise
 * and question set is essential content, so backfill anything that was
 * dropped instead of silently generating a thinner lesson.
 */
function normalizeLessonSections(
  sections: SectionPlanItem[],
  lessonIndex: number
): SectionPlanItem[] {
  const out = [...sections];
  const plannedTypes = exerciseTypesForLesson(lessonIndex, 3);

  // Ensure every EXERCISE section has a type — the pipeline would otherwise
  // fall back to MCQ, losing the planned variety.
  let typeCursor = 0;
  for (const sec of out) {
    if (sec.type === "EXERCISE" && !sec.exerciseType) {
      const used = new Set(
        out.filter((s) => s.type === "EXERCISE" && s.exerciseType).map((s) => s.exerciseType)
      );
      sec.exerciseType =
        plannedTypes.find((t) => !used.has(t)) ??
        plannedTypes[typeCursor++ % plannedTypes.length];
    }
  }

  for (const [type, quota] of SECTION_QUOTA) {
    let count = out.filter((s) => s.type === type).length;
    while (count < quota) {
      const sec: SectionPlanItem = { type, title: BACKFILL_TITLES[type] };
      if (type === "EXERCISE") {
        const used = new Set(
          out.filter((s) => s.type === "EXERCISE").map((s) => s.exerciseType)
        );
        sec.exerciseType =
          plannedTypes.find((t) => !used.has(t)) ?? plannedTypes[count % plannedTypes.length];
      }
      out.push(sec);
      count++;
    }
  }

  return out;
}

type PlanInput = {
  courseTitle: string;
  subjectTitle: string;
  subjectSummary: string;
  goals: string[];
  category: string;
  level: string;
  durationWeeks?: number;
  moduleIndex?: number;
  moduleCount?: number;
  isTaster?: boolean;
};

const EXERCISE_LIST = ALL_EXERCISE_TYPES.join(", ");

const SECTION_TEMPLATE = `
Typical 12-step lesson arc (adapt titles to the topic):
1. READING — concept introduction
2. VIDEO — visual overview
3. WORKSHEET — warm-up problems
4. EXERCISE — hands-on (set exerciseType)
5. READING — deeper theory or worked example
6. WORKSHEET — guided practice
7. QUESTIONS — review quiz (MCQ + open)
8. VIDEO — technique or case study
9. WORKSHEET — applied scenario
10. EXERCISE — different exerciseType from step 4
11. QUESTIONS — checkpoint assessment
12. EXERCISE — consolidation challenge
`.trim();

/**
 * Subject sub-orchestrator. Plans rich lessons (~12 sections, ~5 lessons per module).
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

  const scale = scaleForCourse({
    durationWeeks: input.durationWeeks ?? 8,
    isTaster: false,
  });

  const moduleHint =
    input.moduleIndex !== undefined && input.moduleCount
      ? `This is module ${input.moduleIndex + 1} of ${input.moduleCount} in the course. `
      : "";

  const lessonExerciseHints = Array.from({ length: scale.lessonsPerModule }, (_, li) => {
    const types = exerciseTypesForLesson(li, 3);
    return `Lesson ${li + 1} EXERCISE sections must use: ${types.join(", ")}`;
  }).join("\n");

  const blueprint = await llmJSON({
    task: "planSubjectLessons",
    schema: subjectBlueprintSchema,
    system:
      "You plan comprehensive LMS modules. Each lesson has exactly 12 sections mixing readings, " +
      "videos, worksheets, review questions, and varied interactive exercises. " +
      "Respond with strict JSON only.",
    prompt: `Course: ${input.courseTitle}
${moduleHint}Module: ${input.subjectTitle} — ${input.subjectSummary}
Goals: ${input.goals.join("; ")}
Category: ${input.category}, level: ${input.level}

Return JSON: { lessons: [{ title, summary, sections: [{ type, title?, exerciseType? }] }] }.

Use EXACTLY ${scale.lessonsPerModule} lessons. Each lesson has EXACTLY ${scale.sectionsPerLesson} sections.

${SECTION_TEMPLATE}

Exercise rules:
- Include exactly 3 EXERCISE sections per lesson (steps 4, 10, 12 in the template).
- For every EXERCISE section set exerciseType from: ${EXERCISE_LIST}
- Across the whole module use many different exerciseType values — aim to cover all types in ${EXERCISE_LIST} at least once across the 5 lessons.
${lessonExerciseHints}

Content rules:
- At least 2 WORKSHEET sections per lesson.
- At least 2 QUESTIONS sections per lesson.
- Alternate READING and VIDEO — do not stack 4 worksheets without media.
- Lesson titles should progress: foundations → practice → application → synthesis → capstone.`,
    mock: () => mockSubjectBlueprint(input, scale),
  });

  return {
    lessons: blueprint.lessons.map((lesson, li) => ({
      ...lesson,
      sections: normalizeLessonSections(lesson.sections, li),
    })),
  };
}

function mockSubjectBlueprint(input: PlanInput, scale: CourseScale): SubjectBlueprint {
  const lessonTitles = [
    `Foundations: ${input.subjectTitle}`,
    `Core practice: ${input.subjectTitle}`,
    `Applied scenarios`,
    `Integration & review`,
    `Capstone: ${input.subjectTitle}`,
  ];

  return {
    lessons: lessonTitles.slice(0, scale.lessonsPerModule).map((title, li) => {
      const exTypes = exerciseTypesForLesson(li, 3);
      return {
        title,
        summary: `Lesson ${li + 1} for ${input.subjectTitle}.`,
        sections: [
          { type: "READING" as const, title: "Concept introduction" },
          { type: "VIDEO" as const, title: "Visual overview" },
          { type: "WORKSHEET" as const, title: "Warm-up" },
          { type: "EXERCISE" as const, title: "Hands-on", exerciseType: exTypes[0] },
          { type: "READING" as const, title: "Deep dive" },
          { type: "WORKSHEET" as const, title: "Guided practice" },
          { type: "QUESTIONS" as const, title: "Review quiz" },
          { type: "VIDEO" as const, title: "Worked example" },
          { type: "WORKSHEET" as const, title: "Applied problems" },
          { type: "EXERCISE" as const, title: "Challenge A", exerciseType: exTypes[1] },
          { type: "QUESTIONS" as const, title: "Checkpoint" },
          { type: "EXERCISE" as const, title: "Challenge B", exerciseType: exTypes[2] },
        ],
      };
    }),
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
