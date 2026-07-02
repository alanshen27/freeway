"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Flame, Zap, Coins } from "lucide-react";
import { cn, initials } from "@/lib/utils";

type Props = {
  user: { name: string };
  streak: number;
  xp: number;
  coins: number;
  /** Show an activity dot on the bell (e.g. a course is generating). */
  hasActivity?: boolean;
};

export function TopBar({ user, streak, xp, coins, hasActivity }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/courses?q=${encodeURIComponent(q.trim())}` : "/courses");
  }

  return (
    <div className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-slate-100 bg-white/90 px-6 backdrop-blur-md lg:flex">
      <form onSubmit={submit} className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your courses…"
          className="h-9 w-full rounded-lg border-0 bg-slate-100/80 pl-9 pr-3 text-sm text-foreground placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href="/progress#stats"
          className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100"
          title="View streak and progress"
        >
          <Flame className="size-3.5 text-orange-500" />
          {streak}
        </Link>
        <Link
          href="/progress#stats"
          className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 sm:flex"
          title="View XP and progress"
        >
          <Zap className="size-3.5 text-brand-500" />
          {xp}
        </Link>
        <Link
          href="/shop"
          className="flex items-center gap-1.5 rounded-full bg-lemon-soft px-2.5 py-1 text-xs font-medium text-lemon transition-colors hover:bg-lemon/20"
          title="Spend coins in the shop"
        >
          <Coins className="size-3.5" />
          {coins}
        </Link>

        <span className="mx-2 h-5 w-px bg-slate-200" />

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Bell className="size-[18px]" />
          {hasActivity && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white" />
          )}
        </Link>

        <Link
          href="/settings"
          aria-label="Account settings"
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-course-gradient",
            "text-[11px] font-semibold text-white transition-opacity hover:opacity-85"
          )}
        >
          {initials(user.name)}
        </Link>
      </div>
    </div>
  );
}
