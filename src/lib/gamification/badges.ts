export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Streak days required, or null for non-streak badges. */
  streakDays?: number;
};

/** Badges unlocked by maintaining a daily learning streak. */
export const STREAK_BADGES: BadgeDef[] = [
  {
    id: "streak_3",
    name: "Warm-up",
    description: "3-day learning streak",
    emoji: "🔥",
    streakDays: 3,
  },
  {
    id: "streak_7",
    name: "On a roll",
    description: "7-day learning streak",
    emoji: "⚡",
    streakDays: 7,
  },
  {
    id: "streak_14",
    name: "Dedicated",
    description: "14-day learning streak",
    emoji: "💪",
    streakDays: 14,
  },
  {
    id: "streak_30",
    name: "Unstoppable",
    description: "30-day learning streak",
    emoji: "👑",
    streakDays: 30,
  },
];

export const BADGE_BY_ID = Object.fromEntries(STREAK_BADGES.map((b) => [b.id, b]));

export function badgesForStreak(streak: number, earned: string[]): BadgeDef[] {
  return STREAK_BADGES.filter(
    (b) => b.streakDays != null && streak >= b.streakDays && !earned.includes(b.id)
  );
}

export function nextStreakBadge(streak: number): BadgeDef | null {
  return (
    STREAK_BADGES.filter((b) => b.streakDays != null && streak < b.streakDays!).sort(
      (a, b) => a.streakDays! - b.streakDays!
    )[0] ?? null
  );
}
