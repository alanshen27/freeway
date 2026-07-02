import { prisma } from "@/lib/prisma";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { probeMediaDuration } from "@/lib/media-duration";
import { planCourse } from "./agents/curriculum";
import { planSubjectLessons } from "./agents/subject";
import { writeReadingSection, writeWorksheetSection } from "./agents/text";
import { buildDocumentWithImages } from "./agents/documents";
import { writeQuestionsSection } from "./agents/questions";
import { writeVideo } from "./agents/video";
import { writeExercise } from "./agents/exercise";
import { generateSubjectImage, generateLessonImage, generateCourseImage } from "./agents/cover-image";
import { renderManim } from "./render/manim";
import type { CourseJobData } from "@/lib/queue";
import { clearCourseContent } from "@/lib/section-progress";
import type { ExerciseType } from "@prisma/client";

type LogEntry = { at: string; step: string; msg: string };

async function log(jobId: string, progress: number, step: string, msg: string) {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  const logs = ((job?.logs as unknown as LogEntry[]) ?? []).concat({
    at: new Date().toISOString(),
    step,
    msg,
  });
  const status = job?.status === "QUEUED" ? "RUNNING" : job?.status;
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { progress, step, logs: logs as object, status },
  });
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
export async function runCourseGeneration(data: CourseJobData) {
  const { jobId, courseId } = data;
  try {
    await supersedeStaleJobs(courseId, jobId);
    await log(jobId, 5, "orchestrating", "Planning course subjects…");

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

    const cleared = await clearCourseContent(courseId);
    if (cleared > 0) {
      await log(jobId, 8, "orchestrating", `Cleared ${cleared} existing subject(s)…`);
    }

    await assertActiveJob(jobId);

    const blueprint = await planCourse({
      topic: course.title,
      category: course.category,
      level: course.level,
      interests: course.owner.interests.map((i) => i.interest.label),
      responses: responses.map((r) => ({ prompt: r.prompt, answer: r.answer })),
    });

    await prisma.course.update({
      where: { id: courseId },
      data: {
        title: blueprint.title,
        summary: blueprint.summary,
        level: blueprint.level,
      },
    });

    const courseCoverPromise = generateCourseImage({
      id: courseId,
      title: blueprint.title,
      summary: blueprint.summary,
      category: course.category,
    }).then((coverImageUrl) => {
      if (coverImageUrl) {
        return prisma.course.update({ where: { id: courseId }, data: { coverImageUrl } });
      }
    });

    await log(
      jobId,
      15,
      "structuring",
      `Planned ${blueprint.subjects.length} subjects. Generating lessons…`
    );

    let totalLessons = 0;
    const subjectPlans = await Promise.all(
      blueprint.subjects.map((s) =>
        planSubjectLessons({
          courseTitle: blueprint.title,
          subjectTitle: s.title,
          subjectSummary: s.summary,
          goals: s.goals,
          category: course.category,
          level: blueprint.level,
        })
      )
    );
    totalLessons = subjectPlans.reduce((n, p) => n + p.lessons.length, 0);

    let done = 0;
    const bumpProgress = async (lessonTitle: string, subjectTitle: string) => {
      done++;
      await log(
        jobId,
        15 + Math.round((done / Math.max(totalLessons, 1)) * 80),
        "content",
        `Built "${lessonTitle}" in ${subjectTitle} (${done}/${totalLessons}).`
      );
    };

    await Promise.all([
      courseCoverPromise,
      Promise.all(
      blueprint.subjects.map(async (s, si) => {
        const subPlan = subjectPlans[si];

        const subject = await prisma.subject.create({
          data: {
            courseId,
            title: s.title,
            summary: s.summary,
            goals: s.goals,
            order: si,
          },
        });

        const subjectImagePromise = generateSubjectImage({
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

        await Promise.all([
          subjectImagePromise,
          Promise.all(
          subPlan.lessons.map(async (lp, li) => {
            const lesson = await prisma.lesson.create({
              data: {
                subjectId: subject.id,
                title: lp.title,
                summary: lp.summary,
                order: li,
              },
            });

            const ctx = {
              courseTitle: blueprint.title,
              subjectTitle: s.title,
              lessonTitle: lp.title,
              goals: s.goals,
            };

            await Promise.all([
              generateLessonImage({
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
              }),
              ...lp.sections.map((sec, seci) =>
                generateSection({
                  jobId,
                  sec: sec as SectionPlan,
                  lessonId: lesson.id,
                  courseId,
                  ctx,
                  order: seci,
                })
              ),
            ]);

            await bumpProgress(lp.title, s.title);
          })
        ),
        ]);
      })
    ),
    ]);

    await log(jobId, 96, "assignments", "Creating starter assignments…");
    try {
      const { generateDefaultAssignments } = await import("@/lib/assignments");
      await generateDefaultAssignments(courseId, data.userId);
    } catch (err) {
      console.error("[pipeline] default assignments failed", err);
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { status: "READY", progress: 0 },
    });
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        step: "done",
        result: { courseId } as object,
      },
    });
    await log(jobId, 100, "done", "Your course is ready.");
  } catch (err) {
    console.error("[pipeline] failed", err);
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
}) {
  const { jobId, sec, lessonId, courseId, ctx, order } = args;

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
      const url = await renderManim(renderId, spec.manimScene);
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
          sceneScript: spec.manimScene,
          durationSec: Math.round(durationSec),
          questions: spec.questions as object,
          audioUrl,
          url,
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
}
