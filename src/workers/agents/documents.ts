import { features } from "@/lib/env";
import { generateImage } from "@/lib/image-gen";
import { findStockImage } from "@/lib/serp";
// import { reviewImages } from "@/workers/agents/images";

type ImageSpec = {
  slot: string;
  prompt: string;
  alt: string;
  caption?: string;
  query?: string;
};

type ResolvedImage = ImageSpec & { url: string | null };

export function resolveMarkdownImages(
  markdown: string,
  resolved: { slot: string; url: string }[]
): string {
  let out = markdown;
  for (const { slot, url } of resolved) {
    out = out.replaceAll(`](${slot})`, `](${url})`);
    out = out.replaceAll(`(${slot})`, `(${url})`);
  }
  return out;
}

function stripImageSlot(markdown: string, slot: string): string {
  const escaped = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown
    .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)\\s*\\n?`, "g"), "")
    .replace(new RegExp(`\\(${escaped}\\)`, "g"), "");
}

async function resolveImageUrl(spec: ImageSpec, filename: string): Promise<string | null> {
  if (features.imageGen) {
    const generated = await generateImage(spec.prompt, filename, "generateImage:doc");
    if (generated) return generated;
  }
  if (features.serp) {
    return findStockImage(spec.query ?? spec.prompt);
  }
  return null;
}

async function fetchImages(
  specs: ImageSpec[],
  scopeId: string
): Promise<ResolvedImage[]> {
  return Promise.all(
    specs.map(async (s, i) => ({
      ...s,
      url: await resolveImageUrl(s, `doc-${scopeId}-${s.slot || i}`),
    }))
  );
}

/**
 * Build markdown with generated or SERP images.
 * Vision QA disabled for speed/reliability — images are used as generated.
 */
export async function buildDocumentWithImages(
  markdown: string,
  specs: ImageSpec[],
  scopeId: string
): Promise<{
  markdown: string;
  images: { url: string; alt: string; caption?: string; prompt: string }[];
}> {
  if (specs.length === 0) {
    return { markdown, images: [] };
  }

  const urls = await fetchImages(specs, scopeId);

  /* Image QA disabled — was slow and GLM schema mismatches caused wasted calls.
  for (let pass = 0; pass < 2; pass++) {
    const withUrl = urls.filter((u): u is ResolvedImage & { url: string } => Boolean(u.url));
    if (withUrl.length === 0) break;

    const review = await reviewImages({
      markdown,
      images: withUrl.map((u) => ({
        slot: u.slot,
        query: u.prompt,
        url: u.url,
        alt: u.alt,
      })),
    });

    const needsFix = review.slots.some((s) => !s.relevant && s.newQuery?.trim());
    if (!needsFix) break;

    urls = await applyReplacements(urls, review, scopeId);
  }
  */

  const ok = urls.filter((u): u is ResolvedImage & { url: string } => Boolean(u.url));
  let out = markdown;
  for (const missing of urls.filter((u) => !u.url)) {
    out = stripImageSlot(out, missing.slot);
  }

  return {
    markdown: resolveMarkdownImages(
      out,
      ok.map((u) => ({ slot: u.slot, url: u.url }))
    ),
    images: ok.map((u) => ({
      url: u.url,
      alt: u.alt,
      caption: u.caption,
      prompt: u.prompt,
    })),
  };
}
