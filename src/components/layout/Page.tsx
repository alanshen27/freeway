import Link from "next/link";
import { cn } from "@/lib/utils";

/** Standard page padding + max readable width. No card wrapper. */
export function Page({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  /** Use full main-column width on desktop (tables, course detail). */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8",
        wide ? "max-w-6xl" : "max-w-3xl lg:max-w-4xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            eyebrow ? "mt-1 text-xl sm:text-2xl" : "text-xl sm:text-2xl"
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Subsection label (e.g. "Units", "Recent discussions"). */
export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-sm font-semibold text-foreground",
        className
      )}
    >
      {children}
    </h2>
  );
}

/** Breadcrumb trail for lesson / unit / course hierarchy. */
export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "mb-4 flex max-w-md flex-nowrap items-center gap-1 overflow-hidden text-xs text-muted-foreground sm:max-w-xl lg:max-w-2xl",
        className
      )}
    >
      {items.map((item, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && <span className="shrink-0 text-border">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="truncate hover:text-foreground"
              title={item.label}
            >
              {item.label}
            </Link>
          ) : (
            <span className="truncate text-foreground" title={item.label}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Single bordered panel; children are rows separated with divide-y. */
export function ListPanel({
  children,
  className,
  /** Flat rows on the page background — no card chrome. */
  flat,
}: {
  children: React.ReactNode;
  className?: string;
  flat?: boolean;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border",
        flat
          ? ""
          : "overflow-hidden rounded-lg border border-border bg-white",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ListRow({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const base = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
    className
  );
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return <div className={base}>{children}</div>;
}

/** Groups lesson content on a page — flat layout, no card chrome. */
export function LessonBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}

/** Section wrapper for interactive content — no extra card border. */
export function ContentBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn(className)}>{children}</section>;
}
