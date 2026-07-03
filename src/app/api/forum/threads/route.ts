import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  courseId: z.string(),
  title: z.string().min(2).max(160),
  body: z.string().min(1),
  exerciseId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true, trackSlug: true },
  });
  if (!course || course.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.exerciseId) {
    const exercise = await prisma.exercise.findFirst({
      where: { id: parsed.data.exerciseId, courseId: course.id },
      select: { id: true },
    });
    if (!exercise)
      return NextResponse.json({ error: "Invalid exercise" }, { status: 400 });
  }

  const thread = await prisma.forumThread.create({
    data: {
      trackSlug: course.trackSlug,
      courseId: course.id,
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      exerciseId: parsed.data.exerciseId || null,
    },
  });
  return NextResponse.json({ thread });
}
