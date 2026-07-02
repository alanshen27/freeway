"use client";
import { usePathname } from "next/navigation";
import { MobileAppBar } from "@/components/MobileAppBar";

/** Mobile top bar on list pages; detail pages use PageHeader instead. */
export function AppChrome() {
  const pathname = usePathname();
  const isDetail =
    /^\/courses\/[^/]+/.test(pathname) ||
    /^\/subjects\/[^/]+/.test(pathname) ||
    /^\/lessons\/[^/]+/.test(pathname) ||
    /^\/assignments\/[^/]+/.test(pathname) ||
    /^\/feed\/[^/]+/.test(pathname);

  if (isDetail) return null;
  return <MobileAppBar />;
}
