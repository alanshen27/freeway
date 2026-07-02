import { createClient } from "@supabase/supabase-js";
import { env, features } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage");

/**
 * Upload a generated video to Supabase Storage and return its public URL.
 * Returns null when storage isn't configured so the caller can fall back to a
 * local /public path.
 */
export async function uploadVideoToStorage(
  filename: string,
  data: Buffer | Uint8Array,
  contentType = "video/mp4"
): Promise<string | null> {
  if (!features.supabaseStorage) return null;
  try {
    const admin = createClient(env.supabaseUrl, env.supabaseServiceRole, {
      auth: { persistSession: false },
    });
    const bucket = env.supabaseVideoBucket;

    // Ensure the bucket exists (idempotent).
    await admin.storage.createBucket(bucket, { public: true }).catch(() => {});

    const { error } = await admin.storage
      .from(bucket)
      .upload(filename, data, { contentType, upsert: true });
    if (error) throw error;

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(filename);
    return pub.publicUrl;
  } catch (err) {
    log.warn("upload failed", { filename, contentType }, err);
    return null;
  }
}
