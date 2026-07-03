import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { AssignmentQuizData, AssignmentWorkData } from "@/lib/schemas";

const schema = z.object({ work: z.string().max(100_000) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (assignment.type !== "PRACTICE" && assignment.type !== "PROJECT")
    return NextResponse.json({ error: "Not a written assignment" }, { status: 400 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = (assignment.data as AssignmentWorkData | AssignmentQuizData | null) ?? {};
  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      data: { ...existing, work: parsed.data.work } as object,
    },
  });

  return NextResponse.json({ ok: true, data: updated.data });
}
