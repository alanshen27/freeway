import { prisma } from "@/lib/prisma";
import { CAREERS } from "@/lib/catalog";

/** Stable forum key for a career track (e.g. "introduction-to-physics"). */
export function inferTrackSlug(title: string): string {
  const career = CAREERS.find((c) => c.title === title);
  if (career) return career.slug;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function trackTitle(trackSlug: string): string {
  return CAREERS.find((c) => c.slug === trackSlug)?.title ?? trackSlug;
}

/** User can participate if they have any course on this track. */
export async function userHasForumAccess(
  userId: string,
  trackSlug: string
): Promise<boolean> {
  const count = await prisma.course.count({
    where: { ownerId: userId, trackSlug },
  });
  return count > 0;
}

/** Resolve the viewer's course id for links within a shared track forum. */
export async function viewerCourseIdForTrack(
  userId: string,
  trackSlug: string,
  preferredCourseId?: string
): Promise<string | null> {
  if (preferredCourseId) {
    const preferred = await prisma.course.findFirst({
      where: { id: preferredCourseId, ownerId: userId, trackSlug },
      select: { id: true },
    });
    if (preferred) return preferred.id;
  }
  const course = await prisma.course.findFirst({
    where: { ownerId: userId, trackSlug },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return course?.id ?? null;
}
