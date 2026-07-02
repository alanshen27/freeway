import Link from "next/link";
import { cn } from "@/lib/utils";

/** Freeway mark — three ascending lanes, no generic icon box. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 21.5h10.5c2.5 0 4-1.2 4-3.25S20.5 15 18 15H8"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M8 16h14c2.75 0 4.5-1.35 4.5-3.5S24.75 9 22 9H8"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M8 10.5h7.5"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Hide the wordmark — mark only. */
  compact?: boolean;
  /** sm for sidebar, md default, lg for auth/marketing. */
  size?: "sm" | "md" | "lg";
};

export function BrandLogo({
  href = "/courses",
  className,
  compact,
  size = "md",
}: BrandLogoProps) {
  const markSize =
    size === "sm" ? "size-7" : size === "lg" ? "size-10" : "size-8";
  const wordClass =
    size === "lg"
      ? "text-[1.65rem] font-semibold tracking-[-0.03em]"
      : size === "sm"
        ? "text-[14px] font-semibold tracking-[-0.02em]"
        : "text-[15px] font-semibold tracking-[-0.025em]";

  const inner = (
    <>
      <LogoMark className={markSize} />
      {!compact && (
        <span className={cn("text-slate-900", wordClass)}>
          Freeway
        </span>
      )}
    </>
  );

  const base = cn("inline-flex items-center gap-2.5", className);

  if (href) {
    return (
      <Link href={href} className={cn(base, "transition-opacity hover:opacity-80")}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
