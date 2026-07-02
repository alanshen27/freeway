import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Trophy, Coins, Home, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUserProgressSummary } from "@/lib/gamification/progress";
import { STREAK_BADGES } from "@/lib/gamification/badges";
import { Page, PageTitle } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const stats = await getUserProgressSummary(user.id);
  if (!stats) redirect("/auth");

  const earnedIds = new Set(stats.badges.map((b) => b.id));

  return (
    <Page wide>
      <PageTitle
        eyebrow="Your learning"
        title="Progress"
        description="Track streaks, badges, and course completion."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="duoOutline" size="sm">
              <Link href="/house">
                <Home className="size-4" />
                My room
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/shop">
                <ShoppingBag className="size-4" />
                Shop
              </Link>
            </Button>
          </div>
        }
      />

      <div id="stats" className="mt-6 grid gap-4 sm:grid-cols-3 scroll-mt-20">
        <div className="rounded-xl border border-border bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5 text-orange-500" />
            Streak
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.streak} days</p>
          {stats.nextBadge ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.nextBadge.streakDays! - stats.streak} days until{" "}
              {stats.nextBadge.emoji} {stats.nextBadge.name}
            </p>
          ) : (
            <p className="mt-1 text-xs text-mint">All streak badges unlocked!</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trophy className="size-3.5 text-brand-500" />
            Experience
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.xp} XP</p>
          <p className="mt-1 text-xs text-muted-foreground">Lifetime learning points</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Coins className="size-3.5 text-lemon" />
            Coins
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.coins}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Spend in the{" "}
            <Link href="/shop" className="font-medium text-primary hover:underline">
              shop
            </Link>{" "}
            for your room
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Overall progress</h2>
        <div className="mt-3 rounded-xl border border-border bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {stats.totalDone}/{stats.totalSteps} steps complete
            </span>
            <span className="font-semibold">{stats.overallPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${stats.overallPct}%` }}
            />
          </div>
        </div>
        {stats.courseRows.length > 0 && (
          <ul className="mt-4 space-y-2">
            {stats.courseRows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/courses/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-card transition-colors hover:bg-secondary/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{c.pct}%</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="badges" className="mt-8 scroll-mt-20">
        <h2 className="text-sm font-semibold text-foreground">Badges</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Earn badges by keeping a daily learning streak.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STREAK_BADGES.map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <div
                key={b.id}
                className={`rounded-xl border p-4 text-center ${
                  earned
                    ? "border-mint/30 bg-mint-soft/40"
                    : "border-border bg-white opacity-60"
                }`}
              >
                <span className="text-3xl">{b.emoji}</span>
                <p className="mt-2 text-sm font-semibold text-foreground">{b.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.description}</p>
                {earned ? (
                  <Badge variant="good" className="mt-2">
                    Earned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-2">
                    {b.streakDays} days
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </Page>
  );
}
