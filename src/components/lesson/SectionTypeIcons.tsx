import { cn } from "@/lib/utils";
import {
  SECTION_META,
  orderedSectionTypes,
  type SectionTypeKey,
} from "@/lib/section-types";

const SIZES = {
  sm: { box: "size-7", icon: "size-3.5" },
  md: { box: "size-8", icon: "size-4" },
} as const;

/** Solid tile with white icon — used in module section lists. */
export function SectionTypeIcon({
  type,
  size = "sm",
  className,
}: {
  type: SectionTypeKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const meta = SECTION_META[type];
  const { Icon } = meta;
  const dim = SIZES[size];

  return (
    <span
      title={meta.label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        dim.box,
        meta.bg,
        className
      )}
    >
      <Icon className={cn(dim.icon, meta.color)} aria-hidden />
    </span>
  );
}

/** Compact icon row for lesson lists (video, reading, quiz, etc.). */
export function SectionTypeIcons({
  types,
  size = "sm",
  className,
}: {
  types: string[];
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const ordered = orderedSectionTypes(types);
  if (ordered.length === 0) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {ordered.map((type) => (
        <SectionTypeIcon key={type} type={type} size={size} />
      ))}
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white",
        meta.bg
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.shortLabel}
    </span>
  );
}
