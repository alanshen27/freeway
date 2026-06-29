"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, MessagesSquare, Plus, BookOpen, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/feed", label: "Feed", icon: MessagesSquare },
  { href: "/add", label: "New", icon: Plus },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-white lg:hidden">
      <ul className="flex items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-[22px]" strokeWidth={2} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
