import { CAREERS } from "@/lib/catalog";

/** Stable forum key for a career track (e.g. "introduction-to-physics"). */
export function inferTrackSlug(title: string): string {
  const career = CAREERS.find((c) => c.title === title);
  if (career) return career.slug;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function trackTitle(trackSlug: string): string {
  return CAREERS.find((c) => c.slug === trackSlug)?.title ?? trackSlug;
}
