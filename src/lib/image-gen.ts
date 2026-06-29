import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { env, features, isProd } from "./env";
import { uploadVideoToStorage } from "./supabase/storage";

const PUBLIC_DIR = path.join(process.cwd(), "public/generated/images");

let client: OpenAI | null = null;
function getClient() {
  if (!features.imageGen) return null;
  if (!client) client = new OpenAI({ apiKey: env.openaiKey, timeout: 120_000, maxRetries: 2 });
  return client;
}

function isGptImageModel(model: string) {
  return model.startsWith("gpt-image");
}

function promptLimit(model: string) {
  if (isGptImageModel(model)) return 32_000;
  if (model === "dall-e-2") return 1_000;
  return 4_000;
}

async function imageBufferFromResponse(
  item: OpenAI.Images.Image | undefined
): Promise<Buffer | null> {
  if (!item) return null;
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url) {
    try {
      const res = await fetch(item.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Generate an image with OpenAI. Returns null on failure — caller may try SERP or skip.
 */
export async function generateImage(
  prompt: string,
  filename: string
): Promise<string | null> {
  const openai = getClient();
  if (!openai) {
    if (isProd && features.llm) {
      console.warn("[image-gen] OpenAI not configured for images");
    }
    return null;
  }

  const model = env.openaiImageModel;
  const legacyDalle = model === "dall-e-2" || model === "dall-e-3";

  try {
    const res = await openai.images.generate({
      model,
      prompt: prompt.slice(0, promptLimit(model)),
      n: 1,
      size: "1024x1024",
      ...(legacyDalle ? { response_format: "b64_json" as const } : {}),
      ...(isGptImageModel(model) ? { output_format: "png" as const } : {}),
    });

    const buffer = await imageBufferFromResponse(res.data?.[0]);
    if (!buffer) return null;

    const key = filename.endsWith(".png") ? filename : `${filename}.png`;
    const uploaded = await uploadVideoToStorage(`images/${key}`, buffer, "image/png");
    if (uploaded) return uploaded;

    await mkdir(PUBLIC_DIR, { recursive: true });
    const dest = path.join(PUBLIC_DIR, key);
    await writeFile(dest, buffer);
    return `/generated/images/${key}`;
  } catch (err) {
    console.warn("[image-gen]", (err as Error).message);
    return null;
  }
}
