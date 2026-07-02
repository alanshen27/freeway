/** Human-readable course category (e.g. MECHANICAL_ENGINEERING → Mechanical engineering). */
export function formatCategory(category: string): string {
  const words = category.toLowerCase().replace(/_/g, " ").split(/\s+/);
  if (words.length === 0) return category;
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Human-readable level (e.g. beginner → Beginner). */
export function formatLevel(level: string): string {
  if (!level) return level;
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

export function courseStatusLabel(status: string): string | null {
  switch (status) {
    case "READY":
      return null;
    case "GENERATING":
      return "Generating";
    case "FAILED":
      return "Failed";
    case "DRAFT":
      return "Draft";
    default:
      return formatLevel(status);
  }
}

/** Frosted pill for badges on the course hero (dark overlay). */
export const heroBadgeClass =
  "inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium text-white ring-1 ring-inset ring-white/25";
