import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { llmText } from "@/lib/llm";

const schema = z.object({
  body: z.string().min(1),
  askAI: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { threadId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: { exercise: true },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const post = await prisma.forumPost.create({
    data: { threadId, authorId: user.id, body: parsed.data.body },
  });

  let aiPost = null;
  if (parsed.data.askAI) {
    const reply = await llmText({
      system:
        "You are a friendly, Socratic engineering tutor in a course forum. Give " +
        "a concise, encouraging hint — guide, don't just hand over the answer. " +
        "Reference the exercise if provided.",
      prompt: `Thread: ${thread.title}\n${thread.body}\nStudent question: ${
        parsed.data.body
      }\n${
        thread.exercise
          ? `Exercise: ${thread.exercise.title} — ${thread.exercise.prompt}`
          : ""
      }`,
      mock: () =>
        "Great question! Start by restating what the exercise is asking in your own words, then identify the one quantity you don't yet know. What relationship connects what you have to what you need? Try that and share where you get stuck.",
    });
    aiPost = await prisma.forumPost.create({
      data: { threadId, authorId: user.id, body: reply, isAI: true },
    });
  }

  return NextResponse.json({ post, aiPost });
}
