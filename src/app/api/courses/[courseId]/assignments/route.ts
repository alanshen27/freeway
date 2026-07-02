import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createAssignment } from "@/lib/assignments";

const schema = z.object({
  type: z.enum(["PRACTICE", "PROJECT", "QUIZ"]),
  topic: z.string().max(200).optional(),
  dueInDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  let dueAt: Date | undefined;
  if (parsed.data.dueInDays) {
    dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + parsed.data.dueInDays);
    dueAt.setHours(23, 59, 0, 0);
  }

  try {
    const assignment = await createAssignment({
      courseId,
      userId: user.id,
      type: parsed.data.type,
      topic: parsed.data.topic?.trim() || undefined,
      dueAt,
    });
    return NextResponse.json({ assignment });
  } catch (err) {
    console.error("[api] assignment generation failed", err);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
