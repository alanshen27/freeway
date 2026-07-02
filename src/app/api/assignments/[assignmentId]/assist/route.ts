import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { llmText } from "@/lib/llm";
import type { AssignmentChatMessage } from "@/lib/schemas";

const schema = z.object({ message: z.string().min(1).max(4000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true, milestones: { orderBy: { order: "asc" } } },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const history = (assignment.chatLog as AssignmentChatMessage[]) ?? [];
  const recent = history.slice(-10);

  const milestoneState = assignment.milestones
    .map(
      (m, i) =>
        `${i + 1}. ${m.title} — ${m.completedAt ? "done" : "not done"}`
    )
    .join("\n");

  const reply = await llmText({
    system:
      "You are an AI teaching assistant helping a learner with a specific course assignment. " +
      "Be concise and practical. Guide with hints and structure rather than doing the work for them. " +
      "If they're stuck on a milestone, help them break it down. Use markdown sparingly.",
    prompt: `Course: ${assignment.course.title}
Assignment (${assignment.type.toLowerCase()}): ${assignment.title}
Due: ${assignment.dueAt ? assignment.dueAt.toDateString() : "no due date"}
Instructions:
${assignment.instructions}
${milestoneState ? `\nMilestones:\n${milestoneState}` : ""}
${recent.length ? `\nConversation so far:\n${recent.map((m) => `${m.role}: ${m.content}`).join("\n")}` : ""}

Learner: ${parsed.data.message}`,
    mock: () =>
      "Good question. Break the task into the smallest piece you can act on today — often that's restating the requirement in your own words, then attempting a rough first version. Which milestone are you on? Tell me where it feels stuck and I'll help you unblock that step specifically.",
  });

  const now = new Date().toISOString();
  const newLog: AssignmentChatMessage[] = [
    ...history,
    { role: "user", content: parsed.data.message, at: now },
    { role: "assistant", content: reply, at: new Date().toISOString() },
  ];

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { chatLog: newLog as object },
  });

  return NextResponse.json({ reply });
}
