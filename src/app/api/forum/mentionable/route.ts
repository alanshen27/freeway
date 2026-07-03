import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTrackParticipants } from "@/lib/forum";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { ownerId: true, trackSlug: true },
  });
  if (!course || course.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participants = await getTrackParticipants(course.trackSlug, user.id);
  return NextResponse.json({ participants });
}
