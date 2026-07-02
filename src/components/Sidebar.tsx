"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings,
  MessagesSquare,
  Plus,
  BookOpen,
  Bell,
  LogOut,
  ClipboardList,
  Home,
  BarChart3,
  Shield,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn, initials } from "@/lib/utils";

const mainMenu = [
  { href: "/courses", label: "My courses", icon: BookOpen },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/house", label: "My room", icon: Home },
  { href: "/feed", label: "Feed", icon: MessagesSquare },
  { href: "/add", label: "New course", icon: Plus },
];

const accountMenu = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

type UserInfo = { name: string; email?: string | null; isAdmin?: boolean };

function NavGroup({
  items,
  pathname,
  className,
}: {
  items: typeof mainMenu;
  pathname: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {items.map((it) => {
        const active =
          pathname === it.href || pathname.startsWith(it.href + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "font-normal text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 2} />
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarUserFooter({ user }: { user: UserInfo }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="border-t border-slate-100 px-3 py-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-course-gradient text-[11px] font-semibold text-white">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-slate-800">
            {user.name}
          </p>
          {user.email && (
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          )}
        </div>
        <button
          onClick={logout}
          aria-label="Log out"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200/70 bg-white lg:flex">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo href="/courses" size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <NavGroup items={mainMenu} pathname={pathname} />
        <p className="mb-2 mt-7 px-3 text-[11px] font-medium text-slate-400">
          Account
        </p>
        <NavGroup items={accountMenu} pathname={pathname} />
        {user.isAdmin && (
          <>
            <p className="mb-2 mt-7 px-3 text-[11px] font-medium text-slate-400">
              Admin
            </p>
            <NavGroup
              items={[{ href: "/admin", label: "Admin panel", icon: Shield }]}
              pathname={pathname}
            />
          </>
        )}
      </nav>

      <SidebarUserFooter user={user} />
    </aside>
  );
}
