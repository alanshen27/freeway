"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings,
  MessagesSquare,
  Plus,
  BookOpen,
  Bell,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const mainMenu = [
  { href: "/courses", label: "My courses", icon: BookOpen },
  { href: "/feed", label: "Feed", icon: MessagesSquare },
  { href: "/add", label: "New course", icon: Plus },
];

const accountMenu = [{ href: "/settings", label: "Settings", icon: Settings }];

type UserInfo = { name: string; email?: string | null };

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: typeof mainMenu;
  pathname: string;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-foreground shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary" />
              )}
              <Icon
                className={cn("size-[18px] shrink-0", active && "text-primary")}
                strokeWidth={2}
              />
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SidebarUserFooter({ user }: { user: UserInfo }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="border-t border-slate-200/80 px-5 py-4">
      <div className="flex items-center gap-2 rounded-lg bg-white/80 p-2 shadow-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          {user.email && (
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 text-slate-500 hover:text-slate-900",
              pathname.startsWith("/notifications") && "bg-primary/10 text-primary"
            )}
            asChild
          >
            <Link href="/notifications" aria-label="Notifications">
              <Bell className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-500 hover:text-slate-900"
            onClick={logout}
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200/80 bg-[#f4f4f5] lg:flex">
      <div className="px-5 py-5">
        <Link href="/courses" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold text-slate-900">Freeway</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <NavGroup label="Main menu" items={mainMenu} pathname={pathname} />
        <NavGroup label="Account" items={accountMenu} pathname={pathname} />
      </nav>

      <SidebarUserFooter user={user} />
    </aside>
  );
}
