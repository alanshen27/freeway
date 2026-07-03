import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTrackParticipants, userHasForumAccess } from "@/lib/forum";
import { resolveMentions } from "@/lib/mentions";
import { shapeForumAuthor } from "@/lib/forum-types";

const schema = z.object({
  courseId: z.string(),
  title: z.string().min(2).max(160),
  body: z.string().min(1),
  exerciseId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const trackSlug = searchParams.get("trackSlug");
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? 20), 1), 50);

  let trackSlugs: string[];
  if (trackSlug) {
    if (!(await userHasForumAccess(user.id, trackSlug)))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    trackSlugs = [trackSlug];
  } else {
    const courses = await prisma.course.findMany({
      where: { ownerId: user.id },
      select: { trackSlug: true },
    });
    trackSlugs = [...new Set(courses.map((c) => c.trackSlug))];
  }

  if (trackSlugs.length === 0) return NextResponse.json({ threads: [] });

  const threads = await prisma.forumThread.findMany({
    where: { trackSlug: { in: trackSlugs } },
    include: {
      author: true,
      exercise: { select: { id: true } },
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      trackSlug: t.trackSlug,
      authorId: t.authorId,
      title: t.title,
      body: t.body,
      createdAt: t.createdAt.toISOString(),
      replyCount: t._count.posts,
      author: shapeForumAuthor(t.author),
      exerciseRef: !!t.exercise,
    })),
  });
}

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

  const candidates = await getTrackParticipants(course.trackSlug, user.id);
  const mentionedUserIds = resolveMentions(parsed.data.body, candidates, user.id);

  const thread = await prisma.forumThread.create({
    data: {
      trackSlug: course.trackSlug,
      courseId: course.id,
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      exerciseId: parsed.data.exerciseId || null,
      mentionedUserIds,
    },
  });
  return NextResponse.json({ thread });
}
