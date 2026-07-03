import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Inline @mention chip for rendered forum messages. */
export function MentionChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-flex max-w-full items-center rounded-md bg-brand-50 px-1.5 py-0.5 align-baseline text-[11px] font-semibold leading-tight text-brand-700 ring-1 ring-inset ring-brand-100",
        className
      )}
    >
      @{children}
    </span>
  );
}
