/** All interactive exercise types the pipeline can generate. */
export const ALL_EXERCISE_TYPES = [
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
] as const;

export type PlannedExerciseType = (typeof ALL_EXERCISE_TYPES)[number];

export type CourseScale = {
  moduleCount: number;
  lessonsPerModule: number;
  sectionsPerLesson: number;
  /** Minimum distinct exercise types to use across the module. */
  exerciseTypesPerModule: number;
  videoDurationSec: { min: number; max: number };
  videoBeatCount: { min: number; max: number };
};

const TASTER: CourseScale = {
  moduleCount: 1,
  lessonsPerModule: 1,
  sectionsPerLesson: 4,
  exerciseTypesPerModule: 2,
  videoDurationSec: { min: 90, max: 150 },
  videoBeatCount: { min: 14, max: 22 },
};

/** Full courses: ~12 steps/lesson, ~5 lessons/module, 12–30 modules by duration. */
export function scaleForCourse(args: {
  durationWeeks: number;
  isTaster?: boolean;
}): CourseScale {
  if (args.isTaster) return TASTER;

  const weeks = Math.max(4, args.durationWeeks);
  // 4 w → 12 modules, 52 w → 30 modules
  const moduleCount = Math.min(
    30,
    Math.max(12, Math.round(12 + ((weeks - 4) * 18) / 48))
  );

  return {
    moduleCount,
    lessonsPerModule: 5,
    sectionsPerLesson: 12,
    exerciseTypesPerModule: ALL_EXERCISE_TYPES.length,
    videoDurationSec: { min: 180, max: 360 },
    videoBeatCount: { min: 24, max: 42 },
  };
}

/** Suggested exercise types for a lesson (rotate through the full set). */
export function exerciseTypesForLesson(
  lessonIndex: number,
  perLesson = 3
): PlannedExerciseType[] {
  const start = (lessonIndex * perLesson) % ALL_EXERCISE_TYPES.length;
  const out: PlannedExerciseType[] = [];
  for (let i = 0; i < perLesson; i++) {
    out.push(ALL_EXERCISE_TYPES[(start + i) % ALL_EXERCISE_TYPES.length]);
  }
  return out;
}

export function scaleSummary(scale: CourseScale): string {
  const sections = scale.moduleCount * scale.lessonsPerModule * scale.sectionsPerLesson;
  return (
    `${scale.moduleCount} modules × ${scale.lessonsPerModule} lessons × ` +
    `${scale.sectionsPerLesson} steps (~${sections} sections)`
  );
}
