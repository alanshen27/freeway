import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env, features } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage");
const LOCAL_SUBMISSIONS_DIR = path.join(process.cwd(), "public/generated/submissions");

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

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

/** Upload a learner project submission; falls back to /public/generated/submissions. */
export async function uploadAssignmentSubmission(args: {
  assignmentId: string;
  filename: string;
  data: Buffer;
  contentType: string;
}): Promise<{ url: string; storagePath: string } | null> {
  const safeName = sanitizeFilename(args.filename);
  const storagePath = `assignments/${args.assignmentId}/${randomUUID()}-${safeName}`;

  const uploaded = await uploadVideoToStorage(storagePath, args.data, args.contentType);
  if (uploaded) return { url: uploaded, storagePath };

  try {
    const relDir = path.join("generated/submissions", args.assignmentId);
    const diskName = `${randomUUID()}-${safeName}`;
    const dest = path.join(process.cwd(), "public", relDir, diskName);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, args.data);
    return { url: `/${relDir}/${diskName}`, storagePath: `${relDir}/${diskName}` };
  } catch (err) {
    log.warn("local submission save failed", { assignmentId: args.assignmentId }, err);
    return null;
  }
}

/** Remove a stored submission file (Supabase or local public path). */
export async function deleteAssignmentSubmission(storagePath: string): Promise<void> {
  if (features.supabaseStorage) {
    try {
      const admin = createClient(env.supabaseUrl, env.supabaseServiceRole, {
        auth: { persistSession: false },
      });
      await admin.storage.from(env.supabaseVideoBucket).remove([storagePath]);
      return;
    } catch (err) {
      log.warn("supabase delete failed", { storagePath }, err);
    }
  }

  const localPath = path.join(
    process.cwd(),
    "public",
    storagePath.replace(/^\//, "")
  );
  await unlink(localPath).catch(() => {});
}
