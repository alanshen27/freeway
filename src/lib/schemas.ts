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

export const courseBlueprintSchema = z.object({
  title: z.string(),
  summary: z.string(),
  level: z.string(),
  subjects: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        goals: z.array(z.string()).min(1).max(8),
      })
    )
    .min(12)
    .max(30),
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
        goals: z.array(z.string()).min(1).max(3),
      })
    )
    .length(1),
});
export type TasterCourseBlueprint = z.infer<typeof tasterCourseBlueprintSchema>;

export const subjectBlueprintSchema = z.object({
  lessons: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        sections: z
          .array(
            z.object({
              type: sectionPlanEnum,
              title: z.string().optional(),
              exerciseType: exerciseTypeEnum.optional(),
            })
          )
          .min(10)
          .max(12),
      })
    )
    .min(5)
    .max(5),
});
export type SubjectBlueprint = z.infer<typeof subjectBlueprintSchema>;

export const tasterSubjectBlueprintSchema = z.object({
  lessons: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        sections: z
          .array(
            z.object({
              type: sectionPlanEnum,
              title: z.string().optional(),
              exerciseType: exerciseTypeEnum.optional(),
            })
          )
          .min(3)
          .max(4),
      })
    )
    .length(1),
});
export type TasterSubjectBlueprint = z.infer<typeof tasterSubjectBlueprintSchema>;

export const imageSpecSchema = z.object({
  slot: z.string(),
  /** DALL·E generation prompt (preferred). */
  prompt: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
  /** Optional SERP fallback query when image gen fails. */
  query: z.string().optional(),
});

export const readingSchema = z.object({
  markdown: z.string(),
  images: z.array(imageSpecSchema).min(2).max(5),
});
export type ReadingContent = z.infer<typeof readingSchema>;

export const worksheetSchema = z.object({
  intro: z.string().default(""),
  items: z
    .array(
      z.object({
        prompt: z.string().min(1),
        hint: z.string().optional(),
      })
    )
    .min(5)
    .max(8),
  images: z.array(imageSpecSchema).max(3).default([]),
});
export type WorksheetContent = z.infer<typeof worksheetSchema>;

export const imageSlotReviewSchema = z.object({
  slot: z.string(),
  relevant: z.boolean(),
  reason: z.string().default(""),
  /** Better image search query when relevant is false. */
  newQuery: z.string().optional(),
});

export const imageReviewSchema = z.object({
  ok: z.boolean(),
  notes: z.string().optional(),
  slots: z.array(imageSlotReviewSchema),
});
export type ImageReview = z.infer<typeof imageReviewSchema>;

export const questionMcqSchema = z.object({
  type: z.literal("mcq").optional(),
  question: z.string(),
  choices: z.array(z.string()).min(2),
  answerIndex: z.number().int().min(0),
  explanation: z.string(),
  marks: z.number().int().min(1).max(10).default(1),
});

export const questionOpenSchema = z.object({
  type: z.literal("open"),
  question: z.string(),
  marks: z.number().int().min(1).max(10),
  markScheme: z.string().min(1),
  modelAnswer: z.string().min(1),
  explanation: z.string().optional(),
});

export const questionItemSchema = z.union([questionOpenSchema, questionMcqSchema]);

export const questionsSectionSchema = z.object({
  title: z.string().default("Review questions"),
  items: z.array(questionItemSchema).min(5).max(8),
});
export type QuestionMcqItem = z.infer<typeof questionMcqSchema>;
export type QuestionOpenItem = z.infer<typeof questionOpenSchema>;
export type QuestionItem = z.infer<typeof questionItemSchema>;
export type QuestionsSection = z.infer<typeof questionsSectionSchema>;

/** One visual step — compiled to exactly one self.play or self.wait (no combo animations). */
export const videoBeatSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("title"),
    text: z.string().min(1).max(55),
    runTime: z.number().min(1).max(5).optional(),
  }),
  z.object({
    type: z.literal("shift_title_up"),
    runTime: z.number().min(0.5).max(3).optional(),
  }),
  z.object({
    type: z.literal("text"),
    text: z.string().min(1).max(55),
    runTime: z.number().min(1).max(5).optional(),
  }),
  z.object({
    type: z.literal("wait"),
    seconds: z.number().min(0.5).max(6),
  }),
  z.object({
    type: z.literal("fade_out"),
    runTime: z.number().min(0.5).max(3).optional(),
  }),
  z.object({
    type: z.literal("axes"),
    runTime: z.number().min(1).max(4).optional(),
  }),
  z.object({
    type: z.literal("plot_line"),
    slope: z.number().min(-2).max(2).optional(),
    runTime: z.number().min(1).max(6).optional(),
  }),
  z.object({
    type: z.literal("place_dot"),
    runTime: z.number().min(0.5).max(3).optional(),
  }),
  z.object({
    type: z.literal("move_dot"),
    runTime: z.number().min(2).max(8).optional(),
  }),
  z.object({
    type: z.literal("indicate"),
    runTime: z.number().min(0.5).max(3).optional(),
  }),
  z.object({
    type: z.literal("circumscribe"),
    runTime: z.number().min(0.5).max(3).optional(),
  }),
  z.object({
    type: z.literal("flash"),
    runTime: z.number().min(0.5).max(2).optional(),
  }),
]);
export type VideoBeat = z.infer<typeof videoBeatSchema>;

export const videoBeatPlanSchema = z.object({
  title: z.string(),
  durationSec: z.number().int().min(90).max(360),
  beats: z.array(videoBeatSchema).min(14).max(42),
  questions: z
    .array(
      z.object({
        atSec: z.number().int().min(0),
        question: z.string(),
        choices: z.array(z.string()).min(2),
        answerIndex: z.number().int().min(0),
      })
    )
    .min(2)
    .max(4),
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
  explanation: z.string(),
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
        description: z.string().default(""),
      })
    )
    .max(8)
    .default([]),
  quiz: z.array(quizItemSchema).max(12).default([]),
  /** Model answers / marking criteria (practice assignments only). */
  markscheme: z.string().optional(),
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
  score: z.number().int().min(0).max(100),
  met: z.boolean(),
  feedback: z.string(),
});

export const assignmentGradeSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string(),
  milestones: z.array(assignmentMilestoneGradeSchema),
  strengths: z.array(z.string()).max(5).default([]),
  improvements: z.array(z.string()).max(5).default([]),
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
