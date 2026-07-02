import { prisma } from "@/lib/prisma";
import { badgesForStreak, nextStreakBadge } from "./badges";
import { parseBadges } from "./shop";

export type RewardResult = {
  xp: number;
  coins: number;
  streak: number;
  streakExtended: boolean;
  newBadges: { id: string; name: string; emoji: string }[];
};

const DAY_MS = 86_400_000;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Award XP + matching coins and update the daily streak on a learning action.
 * Streak counts unique UTC days with at least one rewarded action.
 */
export async function awardLearningReward(
  userId: string,
  xpAmount: number
): Promise<RewardResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { xp: 0, coins: 0, streak: 0, streakExtended: false, newBadges: [] };
  }

  const today = startOfUtcDay(new Date());
  const last = user.lastActivityAt ? startOfUtcDay(user.lastActivityAt) : null;

  let streak = user.streak;
  let streakExtended = false;

  if (last === null) {
    streak = 1;
    streakExtended = true;
  } else if (last === today) {
    // Already learned today — keep streak, still grant XP/coins.
  } else if (today - last === DAY_MS) {
    streak += 1;
    streakExtended = true;
  } else {
    streak = 1;
    streakExtended = true;
  }

  const earned = parseBadges(user.badges);
  const unlocked = badgesForStreak(streak, earned);
  const newBadgeIds = unlocked.map((b) => b.id);

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: { increment: xpAmount },
      coins: { increment: xpAmount },
      streak,
      lastActivityAt: new Date(),
      badges: [...earned, ...newBadgeIds],
    },
  });

  return {
    xp: xpAmount,
    coins: xpAmount,
    streak,
    streakExtended,
    newBadges: unlocked.map((b) => ({ id: b.id, name: b.name, emoji: b.emoji })),
  };
}

export { nextStreakBadge };
