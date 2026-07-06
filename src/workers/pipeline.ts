import { prisma } from "@/lib/prisma";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { probeMediaDuration } from "@/lib/media-duration";
import {
  loadLatestCheckpoint,
  saveCheckpoint,
} from "@/lib/generation-checkpoint";
import { createWorkerLogger, type WorkerLogger } from "@/lib/worker-log";
import { scaleForCourse } from "@/lib/course-scale";
import type { CourseBlueprint, SubjectBlueprint } from "@/lib/schemas";
import { planCourse } from "./agents/curriculum";
import { planSubjectLessons } from "./agents/subject";
import { writeReadingSection, writeWorksheetSection } from "./agents/text";
import { buildDocumentWithImages } from "./agents/documents";
import { writeQuestionsSection } from "./agents/questions";
import { writeVideo } from "./agents/video";
import { writeExercise } from "./agents/exercise";
import { generateSubjectImage, generateLessonImage, generateCourseImage } from "./agents/cover-image";
import { renderManimWithRetries } from "./render/manim-retry";
import type { CourseJobData } from "@/lib/queue";
import { getLlmCostSummary, runWithLlmCostContext } from "@/lib/llm";
import { env } from "@/lib/env";
import { createLimiter } from "@/lib/limiter";
import { clearCourseContent } from "@/lib/section-progress";
import type { ExerciseType } from "@prisma/client";
import { Prisma } from "@prisma/client";

type LogEntry = { at: string; step: string; msg: string };

/**
 * Global cap on concurrently generating sections. Without it a big course fans
 * out every subject × lesson × section at once (100+ tasks), exhausting the
 * Prisma connection pool (P2024 timeouts) and hammering LLM rate limits.
 */
const sectionLimit = createLimiter(env.sectionConcurrency);

/** Signals in-flight sibling tasks to stop after the run has failed/finished. */
type RunHandle = { aborted: boolean };

const moduleLog = createWorkerLogger("pipeline-log");

let logChain = Promise.resolve();

/**
 * Serialize job log writes so parallel section workers don't clobber each other.
 * Best-effort: never throws (a failed progress write must not kill generation),
 * never poisons the chain, and never resurrects a COMPLETED/FAILED job — late
 * writes from orphaned section tasks used to flip finished jobs back to RUNNING.
 */
async function log(jobId: string, progress: number, step: string, msg: string) {
  logChain = logChain
    .then(async () => {
      const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
      if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
      const logs = ((job.logs as unknown as LogEntry[]) ?? []).concat({
        at: new Date().toISOString(),
        step,
        msg,
      });
      await prisma.generationJob.updateMany({
        where: { id: jobId, status: { in: ["QUEUED", "RUNNING"] } },
        data: {
          progress,
          step,
          logs: logs as object,
          status: "RUNNING",
        },
      });
    })
    .catch((err) => {
      moduleLog.warn("job log write failed", { jobId, step }, err);
    });
  await logChain;
}

type WritableExerciseType =
  | "CODING"
  | "CIRCUIT"
  | "VISUAL"
  | "MCQ"
  | "GRADED_TEXT"
  | "ORDERING"
  | "FILL_BLANK"
  | "MATCHING"
  | "NUMERIC"
  | "FLASHCARDS"
  | "CATEGORIZE"
  | "CODE_OUTPUT"
  | "LOGIC_CIRCUIT"
  | "GEOMETRY"
  | "FREE_BODY";

type SectionPlan = {
  type: "READING" | "VIDEO" | "WORKSHEET" | "QUESTIONS" | "EXERCISE";
  title?: string;
  exerciseType?: WritableExerciseType;
};

/**
 * Course generation pipeline:
 * 1. Orchestrator plans subjects
 * 2. Per-subject sub-orchestrator plans lessons + section types
 * 3. Per-lesson agents fill each section (reading w/ multi-image QA, video +
 *    ElevenLabs audio, worksheet, questions, interactive exercise)
 */
export async function runCourseGeneration(
  data: CourseJobData,
  parentLog?: WorkerLogger
) {
  return runWithLlmCostContext(
    { jobId: data.jobId, courseId: data.courseId },
    () => runCourseGenerationInner(data, parentLog)
  );
}

async function mergeJobResult(jobId: string, patch: Record<string, unknown>) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { result: true },
  });
  const prev = (job?.result as Record<string, unknown> | null) ?? {};
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { result: { ...prev, ...patch } as object },
  });
}

async function runCourseGenerationInner(
  data: CourseJobData,
  parentLog?: WorkerLogger
) {
  const { jobId, courseId, resume = false } = data;
  const pipelineLog =
    parentLog ??
    createWorkerLogger("pipeline", { jobId, courseId, resume });
  const startedAt = performance.now();
  const run: RunHandle = { aborted: false };

  pipelineLog.info("course generation started");

  try {
    await supersedeStaleJobs(courseId, jobId);
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", progress: 1, step: "orchestrating" },
    });
    await log(jobId, 1, "orchestrating", "Planning course subjects…");

    const course = await prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        owner: { include: { interests: { include: { interest: true } } } },
      },
    });
    const responses = await prisma.onboardingResponse.findMany({
      where: { userId: course.ownerId, category: course.category },
      orderBy: { createdAt: "asc" },
    });

    await prisma.course.update({
      where: { id: courseId },
      data: { status: "GENERATING" },
    });

    const savedCheckpoint = resume ? await loadLatestCheckpoint(courseId) : null;

    if (resume) {
      pipelineLog.info(
        savedCheckpoint
          ? "resuming from checkpoint"
          : "resuming without checkpoint — filling missing sections"
      );
      await log(
        jobId,
        8,
        "orchestrating",
        savedCheckpoint
          ? "Resuming — keeping finished lessons and continuing where it stopped…"
          : "Resuming — keeping existing content and filling in missing sections…"
      );
    } else {
      const cleared = await clearCourseContent(courseId);
      if (cleared > 0) {
        pipelineLog.info("cleared existing course content", { subjects: cleared });
        await log(jobId, 8, "orchestrating", `Cleared ${cleared} existing subject(s)…`);
      }
    }

    await assertActiveJob(jobId, run);

    const planInput = {
      topic: course.title,
      category: course.category,
      level: course.level,
      interests: course.owner.interests.map((i) => i.interest.label),
      responses: responses.map((r) => ({ prompt: r.prompt, answer: r.answer })),
      durationWeeks: course.durationWeeks,
      isTaster: course.isTaster,
    };

    let blueprint: CourseBlueprint;
    let subjectPlans: SubjectBlueprint[];

    if (savedCheckpoint) {
      blueprint = savedCheckpoint.blueprint;
      subjectPlans = savedCheckpoint.subjectPlans;
      pipelineLog.info("loaded checkpoint", {
        subjects: blueprint.subjects.length,
        lessons: subjectPlans.reduce((n, p) => n + p.lessons.length, 0),
      });
    } else {
      const scale = scaleForCourse({
        durationWeeks: course.durationWeeks,
        isTaster: course.isTaster,
      });
      pipelineLog.info("course scale", {
        moduleCount: scale.moduleCount,
        lessonsPerModule: scale.lessonsPerModule,
        sectionsPerLesson: scale.sectionsPerLesson,
        exerciseTypesPerModule: scale.exerciseTypesPerModule,
        videoDurationSec: `${scale.videoDurationSec.min}-${scale.videoDurationSec.max}`,
        videoBeatCount: `${scale.videoBeatCount.min}-${scale.videoBeatCount.max}`,
      });
      blueprint = await pipelineLog.timed("plan course", () => planCourse(planInput));
      subjectPlans = await pipelineLog.timed("plan subject lessons", () =>
        Promise.all(
          blueprint.subjects.map((s, si) =>
            planSubjectLessons({
              courseTitle: blueprint.title,
              subjectTitle: s.title,
              subjectSummary: s.summary,
              goals: s.goals,
              category: course.category,
              level: blueprint.level,
              durationWeeks: course.durationWeeks,
              moduleIndex: si,
              moduleCount: blueprint.subjects.length,
              isTaster: course.isTaster,
            })
          )
        )
      );
    }

    await saveCheckpoint(jobId, { blueprint, subjectPlans });

    await prisma.course.update({
      where: { id: courseId },
      data: {
        title: blueprint.title,
        summary: blueprint.summary,
        level: blueprint.level,
      },
    });

    if (!course.coverImageUrl) {
      applyCoverWhenReady(
        jobId,
        run,
        generateCourseImage({
          id: courseId,
          title: blueprint.title,
          summary: blueprint.summary,
          category: course.category,
        }),
        (coverImageUrl) =>
          prisma.course.update({ where: { id: courseId }, data: { coverImageUrl } }),
        pipelineLog
      );
    }

    const totalLessons = subjectPlans.reduce((n, p) => n + p.lessons.length, 0);
    pipelineLog.info("course planned", {
      title: blueprint.title,
      subjects: blueprint.subjects.length,
      lessons: totalLessons,
    });

    await log(
      jobId,
      15,
      "structuring",
      `Planned ${blueprint.subjects.length} subjects. Generating lessons…`
    );

    let totalSections = 0;
    for (let si = 0; si < blueprint.subjects.length; si++) {
      const subPlan = subjectPlans[si];
      if (!subPlan) continue;
      for (let li = 0; li < subPlan.lessons.length; li++) {
        const lp = subPlan.lessons[li];
        const subject = await prisma.subject.findFirst({
          where: { courseId, order: si },
          include: {
            lessons: {
              where: { order: li },
              include: { sections: { select: { order: true } } },
            },
          },
        });
        const lesson = subject?.lessons[0];
        const existing = new Set(lesson?.sections.map((s) => s.order) ?? []);
        totalSections += lp.sections.filter((_, i) => !existing.has(i)).length;
      }
    }
    totalSections = Math.max(totalSections, 1);

    let sectionsDone = 0;
    let progressChain = Promise.resolve();
    const bumpSectionProgress = async (msg: string) => {
      if (run.aborted) return;
      progressChain = progressChain
        .then(async () => {
          sectionsDone++;
          await log(
            jobId,
            15 + Math.round((sectionsDone / totalSections) * 80),
            "content",
            msg
          );
        })
        .catch(() => {});
      await progressChain;
    };

    await Promise.all(
      blueprint.subjects.map(async (s, si) => {
        const subPlan = subjectPlans[si];
        if (!subPlan) return;

        await assertActiveJob(jobId, run);

        let subject = await prisma.subject.findFirst({
          where: { courseId, order: si },
        });
        if (!subject) {
          subject = await prisma.subject.create({
            data: {
              courseId,
              title: s.title,
              summary: s.summary,
              goals: s.goals,
              order: si,
            },
          });
        }

        if (!subject.imageUrl) {
          applyCoverWhenReady(
            jobId,
            run,
            generateSubjectImage({
              id: subject.id,
              courseTitle: blueprint.title,
              title: s.title,
              summary: s.summary,
              goals: s.goals,
              category: course.category,
            }),
            (imageUrl) =>
              prisma.subject.update({ where: { id: subject.id }, data: { imageUrl } }),
            pipelineLog
          );
        }

        await Promise.all(
          subPlan.lessons.map(async (lp, li) => {
            await assertActiveJob(jobId, run);

            let lesson = await prisma.lesson.findFirst({
              where: { subjectId: subject!.id, order: li },
            });
            if (!lesson) {
              lesson = await prisma.lesson.create({
                data: {
                  subjectId: subject!.id,
                  title: lp.title,
                  summary: lp.summary,
                  order: li,
                },
              });
            }

            const existingSections = await prisma.lessonSection.findMany({
              where: { lessonId: lesson.id },
              select: { order: true },
            });
            const existingOrders = new Set(existingSections.map((sec) => sec.order));

            if (existingOrders.size >= lp.sections.length) {
              pipelineLog.debug("lesson already complete — skipping", {
                subject: s.title,
                lesson: lp.title,
              });
              return;
            }

            if (!lesson.imageUrl) {
              const lessonId = lesson.id;
              applyCoverWhenReady(
                jobId,
                run,
                generateLessonImage({
                  id: lessonId,
                  courseTitle: blueprint.title,
                  subjectTitle: s.title,
                  title: lp.title,
                  summary: lp.summary,
                  category: course.category,
                }),
                (imageUrl) =>
                  prisma.lesson.update({ where: { id: lessonId }, data: { imageUrl } }),
                pipelineLog
              );
            }

            const ctx = {
              courseTitle: blueprint.title,
              subjectTitle: s.title,
              lessonTitle: lp.title,
              goals: s.goals,
              isTaster: course.isTaster,
              durationWeeks: course.durationWeeks,
            };

            await Promise.all(
              lp.sections.map(async (sec, seci) => {
                if (existingOrders.has(seci)) return;
                await sectionLimit(() => {
                  if (run.aborted) return Promise.resolve();
                  return generateSection({
                    jobId,
                    run,
                    sec: sec as SectionPlan,
                    lessonId: lesson!.id,
                    courseId,
                    ctx,
                    order: seci,
                    onComplete: () =>
                      bumpSectionProgress(
                        `Built ${sec.type.toLowerCase()} in "${lp.title}" (${sectionsDone + 1}/${totalSections})`
                      ),
                    log: pipelineLog.child({
                      subject: s.title,
                      lesson: lp.title,
                      sectionType: sec.type,
                      sectionOrder: seci,
                    }),
                  });
                });
              })
            );
          })
        );
      })
    );

    await log(jobId, 96, "assignments", "Creating starter assignments…");
    try {
      const assignmentCount = await prisma.assignment.count({ where: { courseId } });
      if (assignmentCount === 0) {
        const { generateDefaultAssignments } = await import("@/lib/assignments");
        await pipelineLog.timed("create default assignments", () =>
          generateDefaultAssignments(courseId, data.userId)
        );
      } else {
        pipelineLog.debug("assignments already exist — skipping", { assignmentCount });
      }
    } catch (err) {
      pipelineLog.warn("default assignments failed — continuing", {}, err);
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { status: "READY", progress: 0 },
    });
    const llmCost = getLlmCostSummary();
    await mergeJobResult(jobId, { courseId, llmCost });
    // Log first — log() refuses to touch COMPLETED/FAILED jobs, so the status
    // write must be the last thing that happens.
    await log(jobId, 100, "done", "Your course is ready.");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        step: "done",
      },
    });
    pipelineLog.info("course generation completed", {
      durationMs: Math.round(performance.now() - startedAt),
      llmCostUsd: llmCost.totalUsd,
      llmCalls: llmCost.calls,
    });
  } catch (err) {
    run.aborted = true;
    pipelineLog.error(
      "course generation failed",
      { durationMs: Math.round(performance.now() - startedAt) },
      err
    );
    const llmCost = getLlmCostSummary();
    if (llmCost.calls > 0) {
      await mergeJobResult(jobId, { llmCost }).catch(() => {});
    }
    await prisma.generationJob
      .update({
        where: { id: jobId },
        data: { status: "FAILED", error: (err as Error).message },
      })
      .catch(() => {});
    await prisma.course
      .update({ where: { id: courseId }, data: { status: "FAILED" } })
      .catch(() => {});
    throw err;
  }
}

async function supersedeStaleJobs(courseId: string, jobId: string) {
  await prisma.generationJob.updateMany({
    where: {
      courseId,
      id: { not: jobId },
      status: { in: ["QUEUED", "RUNNING"] },
    },
    data: {
      status: "FAILED",
      error: "Superseded by a newer generation run",
    },
  });
}

async function assertActiveJob(jobId: string, run?: RunHandle) {
  if (run?.aborted) throw new Error("Generation run was superseded");
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "FAILED") {
    if (run) run.aborted = true;
    throw new Error("Generation run was superseded");
  }
}

async function assertLesson(lessonId: string) {
  const exists = await prisma.lesson.count({ where: { id: lessonId } });
  if (!exists) throw new Error("Lesson no longer exists (stale generation)");
}

function isStaleGenerationError(err: unknown): boolean {
  return (
    (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") ||
    (err instanceof Error &&
      (err.message.includes("superseded") ||
        err.message.includes("no longer exists")))
  );
}

/** Cover images generate async — skip DB write if course/lesson was deleted or job superseded. */
function applyCoverWhenReady(
  jobId: string,
  run: RunHandle,
  imagePromise: Promise<string | null>,
  apply: (url: string) => Promise<unknown>,
  log?: WorkerLogger
) {
  void imagePromise
    .then(async (url) => {
      if (!url) return;
      await assertActiveJob(jobId, run);
      await apply(url);
    })
    .catch((err) => {
      if (isStaleGenerationError(err)) return;
      log?.warn("cover image update failed", { jobId }, err);
    });
}

async function generateSection(args: {
  jobId: string;
  run: RunHandle;
  sec: SectionPlan;
  lessonId: string;
  courseId: string;
  ctx: {
    courseTitle: string;
    subjectTitle: string;
    lessonTitle: string;
    goals: string[];
    isTaster?: boolean;
    durationWeeks?: number;
  };
  order: number;
  onComplete?: () => Promise<void>;
  log: WorkerLogger;
}) {
  const { jobId, run, sec, lessonId, courseId, ctx, order, onComplete, log: sectionLog } = args;

  await sectionLog.timed(`generate ${sec.type.toLowerCase()} section`, async () => {
  switch (sec.type) {
    case "READING": {
      const draft = await writeReadingSection(ctx);
      await assertActiveJob(jobId, run);
      await assertLesson(lessonId);
      const built = await buildDocumentWithImages(draft.markdown, draft.images, lessonId);
      await prisma.lessonSection.create({
        data: {
          lessonId,
          type: "READING",
          title: sec.title ?? "Reading",
          order,
          data: built as object,
        },
      });
      break;
    }
    case "WORKSHEET": {
      const draft = await writeWorksheetSection(ctx);
      await assertActiveJob(jobId, run);
      await assertLesson(lessonId);
      const intro =
        draft.intro.trim() ||
        `## Worksheet: ${sec.title ?? "Worksheet"}\n\nComplete each problem below.`;
      const built =
        draft.images.length > 0
          ? await buildDocumentWithImages(intro, draft.images, lessonId)
          : { markdown: intro, images: [] };
      await prisma.lessonSection.create({
        data: {
          lessonId,
          type: "WORKSHEET",
          title: sec.title ?? "Worksheet",
          order,
          data: { ...built, intro: built.markdown, items: draft.items } as object,
        },
      });
      break;
    }
    case "QUESTIONS": {
      const qs = await writeQuestionsSection(ctx);
      await assertActiveJob(jobId, run);
      await assertLesson(lessonId);
      await prisma.lessonSection.create({
        data: {
          lessonId,
          type: "QUESTIONS",
          title: qs.title,
          order,
          data: qs as object,
        },
      });
      break;
    }
    case "VIDEO": {
      const spec = await writeVideo({
        courseTitle: ctx.courseTitle,
        lessonTitle: ctx.lessonTitle,
        concepts: ctx.goals,
        isTaster: ctx.isTaster,
        durationWeeks: ctx.durationWeeks,
      });
      const renderId = `vid-${lessonId}-${order}`;
      const rendered = await renderManimWithRetries(
        renderId,
        spec.manimScene,
        { lessonTitle: ctx.lessonTitle },
        sectionLog.child({ scope: "manim" })
      );
      const audioUrl = await synthesizeSpeech(spec.narration, renderId);
      const durationSec = await probeMediaDuration(
        audioUrl,
        spec.narration,
        spec.durationSec
      );
      await assertActiveJob(jobId, run);
      await assertLesson(lessonId);
      const video = await prisma.video.create({
        data: {
          lessonId,
          title: spec.title,
          narration: spec.narration,
          sceneScript: rendered.sceneScript,
          durationSec: Math.round(durationSec),
          questions: spec.questions as object,
          audioUrl,
          url: rendered.url,
          status: "READY",
        },
      });
      await prisma.lessonSection.create({
        data: {
          lessonId,
          type: "VIDEO",
          title: sec.title ?? spec.title,
          order,
          data: { videoId: video.id } as object,
        },
      });
      break;
    }
    case "EXERCISE": {
      const type: WritableExerciseType = sec.exerciseType ?? "MCQ";
      const ex = await writeExercise({
        type,
        courseTitle: ctx.courseTitle,
        lessonTitle: ctx.lessonTitle,
        concepts: ctx.goals,
      });
      await assertActiveJob(jobId, run);
      await assertLesson(lessonId);
      const exercise = await prisma.exercise.create({
        data: {
          courseId,
          lessonId,
          type: ex.type as ExerciseType,
          title: ex.title,
          prompt: ex.prompt,
          difficulty: ex.difficulty,
          config: ex.config as object,
          solution: ex.solution != null ? (ex.solution as object) : undefined,
        },
      });
      await prisma.lessonSection.create({
        data: {
          lessonId,
          type: "EXERCISE",
          title: sec.title ?? ex.title,
          order,
          data: { exerciseId: exercise.id } as object,
        },
      });
      break;
    }
  }
  });

  if (onComplete) await onComplete();
}
