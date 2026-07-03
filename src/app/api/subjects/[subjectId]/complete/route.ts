import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { markSubjectComplete } from "@/lib/section-progress";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { subjectId } = await params;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await markSubjectComplete(user.id, subjectId);
  if (!result) return NextResponse.json({ error: "No sections" }, { status: 400 });

  return NextResponse.json({ ok: true, ...result });
}
