import { cn } from "@/lib/utils";
import {
  SECTION_META,
  orderedSectionTypes,
  type SectionTypeKey,
} from "@/lib/section-types";

/** Compact icon row for lesson lists (video, reading, quiz, etc.). */
export function SectionTypeIcons({
  types,
  size = "sm",
  className,
}: {
  types: string[];
  size?: "sm" | "md";
  className?: string;
}) {
  const ordered = orderedSectionTypes(types);
  if (ordered.length === 0) return null;

  const box = size === "sm" ? "size-7" : "size-8";
  const icon = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {ordered.map((type) => {
        const meta = SECTION_META[type];
        const { Icon } = meta;
        return (
          <span
            key={type}
            title={meta.label}
            className={cn(
              "flex items-center justify-center rounded-md",
              box,
              meta.bg
            )}
          >
            <Icon className={cn(icon, meta.color)} aria-hidden />
          </span>
        );
      })}
    </div>
  );
}

/** Single section type badge with label. */
export function SectionTypeBadge({ type }: { type: SectionTypeKey }) {
  const meta = SECTION_META[type];
  const { Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.bg,
        meta.color
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.shortLabel}
    </span>
  );
}
