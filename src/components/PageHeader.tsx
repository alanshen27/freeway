"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

export function PageHeader({
  title,
  eyebrow,
  backHref,
  action,
  /** Toolbar only — no title row (use when the page has its own hero heading). */
  toolbar,
}: {
  title?: string;
  eyebrow?: string;
  backHref?: string;
  action?: React.ReactNode;
  toolbar?: boolean;
}) {
  const router = useRouter();

  const BackControl = backHref ? (
    <Link
      href={backHref}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      <span className="hidden sm:inline">Back</span>
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );

  if (toolbar) {
    return (
      <header
        className={cn(
          "sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-md",
          "lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:pt-6 lg:pb-0">
          <div className="flex min-w-0 items-center gap-3">
            {BackControl}
            <BrandLogo href="/courses" compact size="sm" className="lg:hidden" />
          </div>
          {action}
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-md",
        "lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
      )}
    >
      <div className="px-4 py-3 lg:px-8 lg:pb-0 lg:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between lg:hidden">
              {BackControl}
              <BrandLogo href="/courses" compact size="sm" />
            </div>
            <div className="hidden lg:block">{BackControl}</div>
            {eyebrow && (
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1
                className={cn(
                  "truncate font-semibold tracking-tight text-foreground",
                  eyebrow ? "mt-1 text-lg sm:text-xl" : "mt-3 text-lg sm:text-xl lg:mt-4"
                )}
              >
                {title}
              </h1>
            )}
          </div>
          {action && <div className="shrink-0 pt-1">{action}</div>}
        </div>
      </div>
    </header>
  );
}
