"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

/** Top bar on mobile for pages without a PageHeader. */
export function MobileAppBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
      <BrandLogo href="/courses" size="sm" />
      <Link
        href="/notifications"
        aria-label="Notifications"
        className="flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="size-[18px]" />
      </Link>
    </header>
  );
}
