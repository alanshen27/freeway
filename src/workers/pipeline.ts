import { prisma } from "@/lib/prisma";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { probeMediaDuration } from "@/lib/media-duration";
import {
  loadLatestCheckpoint,
  saveCheckpoint,
} from "@/lib/generation-checkpoint";
import { createWorkerLogger, type WorkerLogger } from "@/lib/worker-log";
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
import { clearCourseContent } from "@/lib/section-progress";
import type { ExerciseType } from "@prisma/client";

type LogEntry = { at: string; step: string; msg: string };

let logChain = Promise.resolve();

/** Serialize job log writes so parallel section workers don't clobber each other. */
async function log(jobId: string, progress: number, step: string, msg: string) {
  logChain = logChain.then(async () => {
    const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
    const logs = ((job?.logs as unknown as LogEntry[]) ?? []).concat({
      at: new Date().toISOString(),
      step,
      msg,
    });
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        progress,
        step,
        logs: logs as object,
        status: "RUNNING",
      },
    });
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

    await assertActiveJob(jobId);

    const planInput = {
      topic: course.title,
      category: course.category,
      level: course.level,
      interests: course.owner.interests.map((i) => i.interest.label),
      responses: responses.map((r) => ({ prompt: r.prompt, answer: r.answer })),
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
      blueprint = await pipelineLog.timed("plan course", () => planCourse(planInput));
      subjectPlans = await pipelineLog.timed("plan subject lessons", () =>
        Promise.all(
          blueprint.subjects.map((s) =>
            planSubjectLessons({
              courseTitle: blueprint.title,
              subjectTitle: s.title,
              subjectSummary: s.summary,
              goals: s.goals,
              category: course.category,
              level: blueprint.level,
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
      void generateCourseImage({
        id: courseId,
        title: blueprint.title,
        summary: blueprint.summary,
        category: course.category,
      }).then((coverImageUrl) => {
        if (coverImageUrl) {
          return prisma.course.update({ where: { id: courseId }, data: { coverImageUrl } });
        }
      });
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
      progressChain = progressChain.then(async () => {
        sectionsDone++;
        await log(
          jobId,
          15 + Math.round((sectionsDone / totalSections) * 80),
          "content",
          msg
        );
      });
      await progressChain;
    };

    await Promise.all(
      blueprint.subjects.map(async (s, si) => {
        const subPlan = subjectPlans[si];
        if (!subPlan) return;

        await assertActiveJob(jobId);

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
          void generateSubjectImage({
            id: subject.id,
            courseTitle: blueprint.title,
            title: s.title,
            summary: s.summary,
            goals: s.goals,
            category: course.category,
          }).then((imageUrl) => {
            if (imageUrl) {
              return prisma.subject.update({ where: { id: subject.id }, data: { imageUrl } });
            }
          });
        }

        await Promise.all(
          subPlan.lessons.map(async (lp, li) => {
            await assertActiveJob(jobId);

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
              void generateLessonImage({
                id: lesson.id,
                courseTitle: blueprint.title,
                subjectTitle: s.title,
                title: lp.title,
                summary: lp.summary,
                category: course.category,
              }).then((imageUrl) => {
                if (imageUrl) {
                  return prisma.lesson.update({ where: { id: lesson.id }, data: { imageUrl } });
                }
              });
            }

            const ctx = {
              courseTitle: blueprint.title,
              subjectTitle: s.title,
              lessonTitle: lp.title,
              goals: s.goals,
            };

            await Promise.all(
              lp.sections.map(async (sec, seci) => {
                if (existingOrders.has(seci)) return;
                await generateSection({
                  jobId,
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
    await log(jobId, 100, "done", "Your course is ready.");
  } catch (err) {
    pipelineLog.error(
      "course generation failed",
      { durationMs: Math.round(performance.now() - startedAt) },
      err
    );
    const llmCost = getLlmCostSummary();
    if (llmCost.calls > 0) {
      await mergeJobResult(jobId, { llmCost }).catch(() => {});
    }
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: (err as Error).message },
    });
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

async function assertActiveJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "FAILED") {
    throw new Error("Generation run was superseded");
  }
}

async function assertLesson(lessonId: string) {
  const exists = await prisma.lesson.count({ where: { id: lessonId } });
  if (!exists) throw new Error("Lesson no longer exists (stale generation)");
}

async function generateSection(args: {
  jobId: string;
  sec: SectionPlan;
  lessonId: string;
  courseId: string;
  ctx: {
    courseTitle: string;
    subjectTitle: string;
    lessonTitle: string;
    goals: string[];
  };
  order: number;
  onComplete?: () => Promise<void>;
  log: WorkerLogger;
}) {
  const { jobId, sec, lessonId, courseId, ctx, order, onComplete, log: sectionLog } = args;

  await sectionLog.timed(`generate ${sec.type.toLowerCase()} section`, async () => {
  switch (sec.type) {
    case "READING": {
      const draft = await writeReadingSection(ctx);
      await assertActiveJob(jobId);
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
      await assertActiveJob(jobId);
      await assertLesson(lessonId);
      const built =
        draft.images.length > 0
          ? await buildDocumentWithImages(draft.markdown, draft.images, lessonId)
          : { markdown: draft.markdown, images: [] };
      await prisma.lessonSection.create({
        data: {
          lessonId,
          type: "WORKSHEET",
          title: sec.title ?? "Worksheet",
          order,
          data: built as object,
        },
      });
      break;
    }
    case "QUESTIONS": {
      const qs = await writeQuestionsSection(ctx);
      await assertActiveJob(jobId);
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
      await assertActiveJob(jobId);
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
      await assertActiveJob(jobId);
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
