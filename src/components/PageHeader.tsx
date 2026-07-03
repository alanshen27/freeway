"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { pageShellClass } from "@/components/layout/Page";

export function PageHeader({
  title,
  eyebrow,
  backHref,
  action,
  /** Toolbar only — no title row (use when the page has its own hero heading). */
  toolbar,
  /** Match Page wide — keeps header and body left edges aligned. */
  wide,
  /** Match Page prose — narrower reading column. */
  prose,
  /** Render back link in PageNavRow instead of the header. */
  backInNav,
}: {
  title?: string;
  eyebrow?: string;
  backHref?: string;
  action?: React.ReactNode;
  toolbar?: boolean;
  wide?: boolean;
  prose?: boolean;
  backInNav?: boolean;
}) {
  const router = useRouter();
  const showBackInHeader = Boolean(backHref) && !backInNav;

  const BackControl = showBackInHeader ? (
    backHref ? (
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
    )
  ) : null;

  if (toolbar) {
    return (
      <header
        className={cn(
          "sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-md",
          "lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
        )}
      >
        <div
          className={cn(
            pageShellClass({ wide, prose }),
            "flex items-center justify-between gap-3 py-2.5 lg:py-2"
          )}
        >
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
      <div className={pageShellClass({ wide, prose })}>
        <div className="py-2.5 lg:pb-0 lg:pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center justify-between lg:hidden">
                {BackControl}
                <BrandLogo href="/courses" compact size="sm" />
              </div>
              <div className="hidden lg:block">{BackControl}</div>
              {eyebrow && (
                <p
                  className={cn(
                    "text-xs font-medium text-muted-foreground",
                    showBackInHeader ? "mt-3" : "mt-0"
                  )}
                >
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
      </div>
    </header>
  );
}
