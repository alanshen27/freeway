"use client";
import Link from "next/link";
import { Flame, Zap, Coins } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { UserAvatar } from "@/components/UserAvatar";

type Props = {
  user: { name: string; avatarUrl?: string | null };
  streak: number;
  xp: number;
  coins: number;
  /** Unread notifications (unseen generation jobs) — drives the bell dot. */
  hasUnreadNotifications?: boolean;
};

export function TopBar({ user, streak, xp, coins, hasUnreadNotifications }: Props) {
  return (
    <div className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-slate-100 bg-white/90 px-6 backdrop-blur-md lg:flex">
      <GlobalSearch className="w-full max-w-sm" />

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

        <NotificationsMenu initialHasUnread={hasUnreadNotifications} />

        <Link
          href="/settings"
          aria-label="Account settings"
          className="transition-opacity hover:opacity-85"
        >
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />
        </Link>
      </div>
    </div>
  );
}
