import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { writeAssignment } from "@/workers/agents/assignment";
import type { Assignment, AssignmentType } from "@prisma/client";
import type { AssignmentSpec } from "@/lib/schemas";

const log = createLogger("assignments");

function assignmentDataFromSpec(type: AssignmentType, spec: AssignmentSpec) {
  if (type === "QUIZ" && spec.quiz.length) {
    return { items: spec.quiz };
  }
  if (type === "PRACTICE") {
    return {
      work: "",
      ...(spec.markscheme ? { markscheme: spec.markscheme } : {}),
    };
  }
  if (type === "PROJECT") {
    return { work: "" };
  }
  return undefined;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  d.setHours(23, 59, 0, 0);
  return d;
}

/**
 * Generate one assignment for a course. Creates the row in GENERATING state,
 * fills it via the LLM agent, and spreads milestone due dates evenly up to the
 * assignment due date.
 */
export async function createAssignment(opts: {
  courseId: string;
  userId: string;
  type: AssignmentType;
  topic?: string;
  dueAt?: Date;
}): Promise<Assignment> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: opts.courseId },
    include: { subjects: { orderBy: { order: "asc" } } },
  });

  const dueAt =
    opts.dueAt ?? daysFromNow((course.durationWeeks * 7) / 4);

  const assignment = await prisma.assignment.create({
    data: {
      courseId: course.id,
      userId: opts.userId,
      type: opts.type,
      title: "Generating…",
      status: "GENERATING",
      dueAt,
    },
  });

  try {
    const spec = await writeAssignment({
      type: opts.type,
      courseTitle: course.title,
      courseSummary: course.summary,
      level: course.level,
      subjects: course.subjects.map((s) => ({ title: s.title, summary: s.summary })),
      topic: opts.topic,
      durationWeeks: course.durationWeeks,
    });

    const msUntilDue = dueAt.getTime() - Date.now();
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        title: spec.title,
        instructions: spec.instructions,
        status: "READY",
        data: assignmentDataFromSpec(opts.type, spec) as object | undefined,
        milestones: spec.milestones.length
          ? {
              create: spec.milestones.map((m, i) => ({
                title: m.title,
                description: m.description,
                order: i,
                // Milestones pace evenly toward the assignment due date.
                dueAt: new Date(
                  Date.now() +
                    (msUntilDue * (i + 1)) / spec.milestones.length
                ),
              })),
            }
          : undefined,
      },
    });
  } catch (err) {
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: "FAILED", error: (err as Error).message },
    });
    throw err;
  }

  return prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
}

/**
 * Default assignment set created right after course generation: an early
 * checkpoint quiz, a mid-course practice set, and a capstone-style project —
 * due dates paced across the learner's chosen course duration.
 */
export async function generateDefaultAssignments(courseId: string, userId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return;

  if (course.isTaster) {
    try {
      await createAssignment({
        courseId,
        userId,
        type: "QUIZ",
        dueAt: daysFromNow(7),
      });
    } catch (err) {
      log.error("taster quiz failed", { courseId }, err);
    }
    return;
  }

  const days = course.durationWeeks * 7;

  const plan: { type: AssignmentType; dueInDays: number }[] = [
    { type: "QUIZ", dueInDays: days * 0.2 },
    { type: "PRACTICE", dueInDays: days * 0.5 },
    { type: "PROJECT", dueInDays: days * 0.95 },
  ];

  for (const p of plan) {
    try {
      await createAssignment({
        courseId,
        userId,
        type: p.type,
        dueAt: daysFromNow(p.dueInDays),
      });
    } catch (err) {
      // A failed default assignment shouldn't fail the course.
      log.error(`default ${p.type} failed`, { courseId, type: p.type }, err);
    }
  }
}
