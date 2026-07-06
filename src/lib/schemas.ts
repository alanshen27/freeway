import { z } from "zod";

const exerciseTypeEnum = z.enum([
  "CODING",
  "CIRCUIT",
  "VISUAL",
  "MCQ",
  "GRADED_TEXT",
  "ORDERING",
  "FILL_BLANK",
  "MATCHING",
  "NUMERIC",
  "FLASHCARDS",
  "CATEGORIZE",
  "CODE_OUTPUT",
  "LOGIC_CIRCUIT",
  "GEOMETRY",
  "FREE_BODY",
]);

const sectionPlanEnum = z.enum(["READING", "VIDEO", "WORKSHEET", "QUESTIONS", "EXERCISE"]);

const clampNum = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/*
 * LLM contract helpers. Two constraints shape these:
 * 1. Strict tool mode forces every key to be present, so models emit `null`
 *    for fields they'd rather omit — optionals must accept null.
 * 2. min/max bounds are STRIPPED from the wire schema (DeepSeek strict mode
 *    rejects them), so the model never sees them — enforce them by clamping,
 *    truncating, or defaulting instead of failing the whole generation.
 */

/** Optional string that also accepts null (strict mode forces the key). */
const optionalString = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

/** String with a fallback for both missing and null. */
const stringWithDefault = (fallback: string) =>
  z
    .string()
    .nullish()
    .transform((v) => v ?? fallback);

/** Round + clamp instead of rejecting 87.5 or an out-of-range mark. */
const intInRange = (lo: number, hi: number, fallback: number) =>
  z
    .number()
    .nullish()
    .transform((v) => clampNum(Math.round(v ?? fallback), lo, hi));

/**
 * Strict tool mode forces every key to be present, so models emit `null` for
 * sections that have no exerciseType (or title). Accept null and drop it.
 */
const sectionPlanItemSchema = z.object({
  type: sectionPlanEnum,
  title: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  exerciseType: exerciseTypeEnum
    .nullish()
    .transform((v) => v ?? undefined),
});

export const courseBlueprintSchema = z.object({
  title: z.string(),
  summary: z.string(),
  level: z.string(),
  subjects: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        goals: z
          .array(z.string())
          .min(1)
          .transform((g) => g.slice(0, 8)),
      })
    )
    .min(12)
    .transform((s) => s.slice(0, 30)),
});
export type CourseBlueprint = z.infer<typeof courseBlueprintSchema>;

export const tasterCourseBlueprintSchema = z.object({
  title: z.string(),
  summary: z.string(),
  level: z.string(),
  subjects: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        goals: z
          .array(z.string())
          .min(1)
          .transform((g) => g.slice(0, 3)),
      })
    )
    .min(1)
    .transform((s) => s.slice(0, 1)),
});
export type TasterCourseBlueprint = z.infer<typeof tasterCourseBlueprintSchema>;

export const subjectBlueprintSchema = z.object({
  lessons: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        // Missing sections get backfilled by normalizeLessonSections; extras trimmed.
        sections: z
          .array(sectionPlanItemSchema)
          .min(3)
          .transform((s) => s.slice(0, 12)),
      })
    )
    .min(5)
    .transform((l) => l.slice(0, 5)),
});
export type SubjectBlueprint = z.infer<typeof subjectBlueprintSchema>;

export const tasterSubjectBlueprintSchema = z.object({
  lessons: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        sections: z
          .array(sectionPlanItemSchema)
          .min(2)
          .transform((s) => s.slice(0, 4)),
      })
    )
    .min(1)
    .transform((l) => l.slice(0, 1)),
});
export type TasterSubjectBlueprint = z.infer<typeof tasterSubjectBlueprintSchema>;

export const imageSpecSchema = z.object({
  slot: z.string(),
  /** DALL·E generation prompt (preferred). */
  prompt: z.string(),
  alt: z.string(),
  caption: optionalString,
  /** Optional SERP fallback query when image gen fails. */
  query: optionalString,
});

export const readingSchema = z.object({
  markdown: z.string(),
  // Fewer images than asked-for is a thinner reading, not a failure.
  images: z.array(imageSpecSchema).transform((im) => im.slice(0, 5)),
});
export type ReadingContent = z.infer<typeof readingSchema>;

export const worksheetSchema = z.object({
  intro: stringWithDefault(""),
  items: z
    .array(
      z.object({
        prompt: z.string().min(1),
        hint: optionalString,
      })
    )
    .min(3)
    .transform((it) => it.slice(0, 12)),
  images: z
    .array(imageSpecSchema)
    .nullish()
    .transform((im) => (im ?? []).slice(0, 3)),
});
export type WorksheetContent = z.infer<typeof worksheetSchema>;

export const imageSlotReviewSchema = z.object({
  slot: z.string(),
  relevant: z.boolean(),
  reason: stringWithDefault(""),
  /** Better image search query when relevant is false. */
  newQuery: optionalString,
});

export const imageReviewSchema = z.object({
  ok: z.boolean(),
  notes: optionalString,
  slots: z.array(imageSlotReviewSchema),
});
export type ImageReview = z.infer<typeof imageReviewSchema>;

export const questionMcqSchema = z.object({
  type: z
    .literal("mcq")
    .nullish()
    .transform((v) => v ?? undefined),
  question: z.string(),
  choices: z.array(z.string()).min(2),
  answerIndex: z.number().int().min(0),
  explanation: stringWithDefault(""),
  marks: intInRange(1, 10, 1),
});

export const questionOpenSchema = z.object({
  type: z.literal("open"),
  question: z.string(),
  marks: intInRange(1, 10, 2),
  markScheme: z.string().min(1),
  modelAnswer: z.string().min(1),
  explanation: optionalString,
});

export const questionItemSchema = z.union([questionOpenSchema, questionMcqSchema]);

export const questionsSectionSchema = z.object({
  title: stringWithDefault("Review questions"),
  items: z
    .array(questionItemSchema)
    .min(3)
    .transform((it) => it.slice(0, 10)),
});
export type QuestionMcqItem = z.infer<typeof questionMcqSchema>;
export type QuestionOpenItem = z.infer<typeof questionOpenSchema>;
export type QuestionItem = z.infer<typeof questionItemSchema>;
export type QuestionsSection = z.infer<typeof questionsSectionSchema>;

/**
 * Out-of-range numbers from the model get clamped instead of failing the
 * whole plan — a slightly long runTime should never abort course generation.
 */
const clampedRunTime = (lo: number, hi: number) =>
  z
    .number()
    .optional()
    .transform((n) => (n === undefined ? undefined : clampNum(n, lo, hi)));

/** Beat captions get truncated (the compiler also width-fits them on screen). */
const beatText = (max: number) => z.string().min(1).transform((t) => t.slice(0, max));

/** One visual step — compiled to exactly one self.play or self.wait (no combo animations). */
export const videoBeatSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("title"),
    text: beatText(60),
    runTime: clampedRunTime(1, 5),
  }),
  z.object({
    type: z.literal("shift_title_up"),
    runTime: clampedRunTime(0.5, 3),
  }),
  z.object({
    type: z.literal("text"),
    text: beatText(60),
    runTime: clampedRunTime(1, 5),
  }),
  z.object({
    type: z.literal("wait"),
    seconds: z
      .number()
      .default(2)
      .transform((s) => clampNum(s, 0.5, 8)),
  }),
  z.object({
    type: z.literal("fade_out"),
    runTime: clampedRunTime(0.5, 3),
  }),
  z.object({
    type: z.literal("axes"),
    runTime: clampedRunTime(1, 4),
  }),
  z.object({
    type: z.literal("plot_line"),
    slope: z
      .number()
      .optional()
      .transform((n) => (n === undefined ? undefined : clampNum(n, -2, 2))),
    runTime: clampedRunTime(1, 6),
  }),
  z.object({
    type: z.literal("place_dot"),
    runTime: clampedRunTime(0.5, 3),
  }),
  z.object({
    type: z.literal("move_dot"),
    runTime: clampedRunTime(2, 8),
  }),
  z.object({
    type: z.literal("indicate"),
    runTime: clampedRunTime(0.5, 3),
  }),
  z.object({
    type: z.literal("circumscribe"),
    runTime: clampedRunTime(0.5, 3),
  }),
  z.object({
    type: z.literal("flash"),
    runTime: clampedRunTime(0.5, 2),
  }),
]);
export type VideoBeat = z.infer<typeof videoBeatSchema>;

/**
 * Lenient question item — malformed entries (missing choices/answerIndex) are
 * filtered out in writeVideo instead of failing the entire beat plan.
 */
const videoQuestionDraftSchema = z.object({
  atSec: z
    .number()
    .optional()
    .transform((n) => (n === undefined ? undefined : Math.max(0, Math.round(n)))),
  question: z.string(),
  choices: z.array(z.string()).optional(),
  answerIndex: z.number().int().min(0).optional(),
});
export type VideoQuestionDraft = z.infer<typeof videoQuestionDraftSchema>;

export const videoBeatPlanSchema = z.object({
  title: z.string(),
  durationSec: z
    .number()
    .int()
    .transform((n) => clampNum(n, 60, 600)),
  // No upper bound — plans with extra beats just make a longer video.
  beats: z.array(videoBeatSchema).min(8),
  questions: z.array(videoQuestionDraftSchema).default([]),
});
export type VideoBeatPlan = z.infer<typeof videoBeatPlanSchema>;

/** @deprecated use videoBeatPlanSchema + separate narration pass */
export const videoPlanSchema = videoBeatPlanSchema.extend({
  narration: z.string().min(120),
});
export type VideoPlan = z.infer<typeof videoPlanSchema>;

export const videoSchema = z.object({
  title: z.string(),
  narration: z.string(),
  manimScene: z.string(),
  durationSec: z.number().int().min(75).max(360).default(180),
  questions: z
    .array(
      z.object({
        atSec: z.number().int().min(0),
        question: z.string(),
        choices: z.array(z.string()).min(2),
        answerIndex: z.number().int().min(0),
      })
    )
    .default([]),
});
export type VideoSpec = z.infer<typeof videoSchema>;

export const exerciseSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  difficulty: z.string().default("intro"),
  config: z.record(z.unknown()).default({}),
  solution: z.any().optional(),
});
export type ExerciseSpec = z.infer<typeof exerciseSchema>;

export const quizItemSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()).min(2),
  answerIndex: z.number().int().min(0),
  explanation: stringWithDefault(""),
});
export type QuizItem = z.infer<typeof quizItemSchema>;

export const assignmentSpecSchema = z.object({
  title: z.string(),
  /** Markdown brief: context, requirements, deliverables, tips. */
  instructions: z.string(),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        description: stringWithDefault(""),
      })
    )
    .nullish()
    .transform((m) => (m ?? []).slice(0, 8)),
  quiz: z
    .array(quizItemSchema)
    .nullish()
    .transform((q) => (q ?? []).slice(0, 12)),
  /** Model answers / marking criteria (practice assignments only). */
  markscheme: optionalString,
});
export type AssignmentSpec = z.infer<typeof assignmentSpecSchema>;

/** Shape of Assignment.data for quizzes. */
export type AssignmentQuizData = {
  items: QuizItem[];
  result?: { score: number; total: number; answers: number[]; submittedAt: string };
};

/** Learner work + optional markscheme (practice / project assignments). */
export type AssignmentSubmissionFile = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  size: number;
  contentType: string;
  uploadedAt: string;
};

export type AssignmentWorkData = {
  work?: string;
  markscheme?: string;
  submissions?: AssignmentSubmissionFile[];
  grade?: AssignmentGrade;
};

export const assignmentMilestoneGradeSchema = z.object({
  milestone: z.string(),
  // Models grade "87.5" or "-" sometimes — round and clamp, don't fail the grade.
  score: intInRange(0, 100, 0),
  met: z.boolean(),
  feedback: stringWithDefault(""),
});

export const assignmentGradeSchema = z.object({
  overallScore: intInRange(0, 100, 0),
  summary: z.string(),
  milestones: z.array(assignmentMilestoneGradeSchema),
  strengths: z
    .array(z.string())
    .nullish()
    .transform((s) => (s ?? []).slice(0, 5)),
  improvements: z
    .array(z.string())
    .nullish()
    .transform((s) => (s ?? []).slice(0, 5)),
});

export type AssignmentGrade = z.infer<typeof assignmentGradeSchema> & {
  gradedAt: string;
};

export type AssignmentChatMessage = {
  role: "user" | "assistant";
  content: string;
  at: string;
};

export type ReadingSectionData = {
  markdown: string;
  images: { url: string; alt: string; caption?: string; prompt: string }[];
};

export type WorksheetSectionData = {
  /** Legacy — full markdown with numbered problems. */
  markdown?: string;
  intro?: string;
  items?: { prompt: string; hint?: string }[];
  images?: ReadingSectionData["images"];
};

export type QuestionsSectionData = QuestionsSection;
