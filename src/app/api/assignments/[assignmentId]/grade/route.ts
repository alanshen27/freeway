import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { llmJSON } from "@/lib/llm";
import {
  assignmentGradeSchema,
  type AssignmentGrade,
  type AssignmentWorkData,
} from "@/lib/schemas";

function workData(assignment: { data: unknown }): AssignmentWorkData {
  return (assignment.data as AssignmentWorkData | null) ?? {};
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: true,
      milestones: { orderBy: { order: "asc" } },
    },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (assignment.type !== "PRACTICE" && assignment.type !== "PROJECT")
    return NextResponse.json({ error: "Not a gradable assignment" }, { status: 400 });

  const data = workData(assignment);
  const work = data.work?.trim() ?? "";
  const submissions = data.submissions ?? [];

  if (!work && submissions.length === 0)
    return NextResponse.json(
      { error: "Add written work or upload a file before grading." },
      { status: 400 }
    );

  const milestoneBlock =
    assignment.milestones.length > 0
      ? assignment.milestones
          .map(
            (m, i) =>
              `${i + 1}. ${m.title}\n   Criteria: ${m.description || "See assignment instructions."}\n   Learner marked complete: ${m.completedAt ? "yes" : "no"}`
          )
          .join("\n")
      : "No formal milestones — grade against the assignment instructions as a whole.";

  const submissionBlock =
    submissions.length > 0
      ? `\nUploaded files (content not parsed): ${submissions.map((f) => f.name).join(", ")}`
      : "";

  const markschemeBlock =
    assignment.type === "PRACTICE" && data.markscheme?.trim()
      ? `\nReference markscheme (for grading only):\n${data.markscheme.slice(0, 4000)}`
      : "";

  const result = await llmJSON({
    task: "gradeAssignment",
    schema: assignmentGradeSchema,
    system:
      "You are a fair course assessor. Grade the learner's work against each milestone's criteria " +
      "and the assignment brief. Be constructive and specific. Score 0–100 per milestone where " +
      "60+ means criteria substantially met. Return strict JSON only.",
    prompt: `Course: ${assignment.course.title}
Assignment type: ${assignment.type}
Title: ${assignment.title}

Instructions:
${assignment.instructions.slice(0, 6000)}

Milestones to assess:
${milestoneBlock}
${markschemeBlock}

Learner written work:
${work.slice(0, 12000) || "(none)"}${submissionBlock}

Return JSON:
{
  overallScore: number (0-100),
  summary: string (2-4 sentences),
  milestones: [{ milestone: string (title), score: number, met: boolean, feedback: string }],
  strengths: string[],
  improvements: string[]
}

Include one milestones entry per milestone listed above (or one entry for the whole assignment if none).`,
    mock: () => ({
      overallScore: 72,
      summary:
        "Your submission addresses several milestone criteria with clear effort. Some areas need more depth and explicit ties back to the assignment requirements.",
      milestones: assignment.milestones.length
        ? assignment.milestones.map((m) => ({
            milestone: m.title,
            score: 70,
            met: false,
            feedback:
              m.description ||
              "Partially meets this stage — expand with more detail and evidence from your work.",
          }))
        : [
            {
              milestone: "Overall assignment",
              score: 72,
              met: true,
              feedback: "Covers the main requirements; strengthen structure and specificity.",
            },
          ],
      strengths: ["Clear attempt at the core tasks", "Work is organized and readable"],
      improvements: ["Add more detail for weaker milestones", "Tie conclusions back to the brief"],
    }),
  });

  const grade: AssignmentGrade = {
    ...result,
    gradedAt: new Date().toISOString(),
  };

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      data: { ...data, grade } as object,
    },
  });

  return NextResponse.json({ grade, data: updated.data });
}
