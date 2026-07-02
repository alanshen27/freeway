import { prisma } from "@/lib/prisma";
import { getCourseCompletion, completionPct } from "@/lib/section-progress";
import { BADGE_BY_ID, nextStreakBadge } from "@/lib/gamification/badges";
import { parseBadges } from "@/lib/gamification/shop";

export async function getUserProgressSummary(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const courses = await prisma.course.findMany({
    where: { ownerId: userId, status: "READY" },
    select: { id: true, title: true },
  });
  const completion = await getCourseCompletion(
    userId,
    courses.map((c) => c.id)
  );

  let totalDone = 0;
  let totalSteps = 0;
  const courseRows = courses.map((c) => {
    const cpl = completion.get(c.id) ?? { done: 0, total: 0 };
    totalDone += cpl.done;
    totalSteps += cpl.total;
    return {
      id: c.id,
      title: c.title,
      ...cpl,
      pct: completionPct(cpl),
    };
  });

  const badgeIds = parseBadges(user.badges);
  const badges = badgeIds
    .map((id) => BADGE_BY_ID[id])
    .filter(Boolean)
    .map((b) => ({ id: b!.id, name: b!.name, emoji: b!.emoji, description: b!.description }));

  const nextBadge = nextStreakBadge(user.streak);

  return {
    xp: user.xp,
    coins: user.coins,
    streak: user.streak,
    badges,
    nextBadge,
    courseRows,
    overallPct: completionPct({ done: totalDone, total: totalSteps }),
    totalDone,
    totalSteps,
  };
}
