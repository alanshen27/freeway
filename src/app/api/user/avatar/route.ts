import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  deleteStoredFile,
  storagePathFromPublicUrl,
  uploadUserAvatar,
} from "@/lib/supabase/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function removeCurrentAvatar(avatarUrl: string | null) {
  if (!avatarUrl) return;
  const storagePath = storagePathFromPublicUrl(avatarUrl);
  if (storagePath) await deleteStoredFile(storagePath);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0)
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 400 });

  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(contentType))
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or GIF image" },
      { status: 400 }
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadUserAvatar({
    userId: user.id,
    filename: file.name,
    data: buffer,
    contentType,
  });
  if (!uploaded)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });

  await removeCurrentAvatar(user.avatarUrl);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: uploaded.url },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ avatarUrl: updated.avatarUrl });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });
  if (!user.avatarUrl) return NextResponse.json({ ok: true, avatarUrl: null });

  await removeCurrentAvatar(user.avatarUrl);

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true, avatarUrl: null });
}
