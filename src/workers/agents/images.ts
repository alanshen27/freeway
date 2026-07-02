import type OpenAI from "openai";
import { llmVisionJSON } from "@/lib/llm";
import { imageReviewSchema, type ImageReview } from "@/lib/schemas";

function mockReview(
  images: { slot: string }[]
): ImageReview {
  return {
    ok: true,
    slots: images.map((img) => ({
      slot: img.slot,
      relevant: true,
      reason: "",
    })),
  };
}

/** Raster formats accepted by the vision API. */
const VISION_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function visionMime(url: string): string | null {
  if (!url.startsWith("data:")) return null;
  const semi = url.indexOf(";");
  if (semi < 0) return null;
  return url.slice(5, semi);
}

/** Fetch remote image into a data URI; returns null on any failure. */
async function toDataUri(url: string): Promise<string | null> {
  if (url.startsWith("data:")) {
    const mime = visionMime(url);
    return mime && VISION_MIMES.has(mime) ? url : null;
  }
  if (!url.startsWith("http")) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Freeway/1.0" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0]?.trim();
    if (!type || !VISION_MIMES.has(type)) return null;
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${b64}`;
  } catch {
    return null;
  }
}

/**
 * Vision QA: the model sees each fetched image and judges whether it fits the
 * lesson markdown. Irrelevant slots get a revised search query for re-fetch.
 */
export async function reviewImages(args: {
  markdown: string;
  images: { slot: string; query: string; url: string; alt: string }[];
}): Promise<ImageReview> {
  if (args.images.length === 0) {
    return { ok: true, slots: [] };
  }

  try {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text:
        `Review each image for an LMS lesson document. An image is relevant when it ` +
        `clearly illustrates the surrounding lesson content (not generic stock clutter, ` +
        `wrong topic, memes, watermarked junk, or decorative placeholders with no ` +
        `instructional value).\n\n` +
        `Lesson markdown:\n${args.markdown.slice(0, 3000)}\n\n` +
        `For each slot below you will see the search query, alt text, and the actual image.`,
    },
  ];

  for (const img of args.images) {
    content.push({
      type: "text",
      text: `\n--- ${img.slot} ---\nQuery: "${img.query}"\nAlt: "${img.alt}"`,
    });
    const dataUri = await toDataUri(img.url);
    if (dataUri) {
      content.push({
        type: "image_url",
        image_url: { url: dataUri, detail: "low" },
      });
    }
  }

  content.push({
    type: "text",
    text:
      `Return JSON:\n` +
      `{ ok: boolean (true only if every image is suitable), notes?: string, ` +
      `slots: [{ slot, relevant, reason, newQuery? }] }\n` +
      `Include every slot. When relevant is false, newQuery must be a better ` +
      `DALL·E image generation prompt (detailed scene description, no text in image).`,
  });

  return llmVisionJSON({
    task: "reviewImages",
    schema: imageReviewSchema,
    system:
      "You QA instructional images by viewing them and judging fit for the lesson. " +
      "Be strict: reject off-topic, low-quality, or misleading images. JSON only.",
    content,
    mock: () => mockReview(args.images),
  });
  } catch {
    return mockReview(args.images);
  }
}
