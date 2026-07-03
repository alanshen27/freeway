import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  deleteAssignmentSubmission,
  uploadAssignmentSubmission,
} from "@/lib/supabase/storage";
import type { AssignmentWorkData } from "@/lib/schemas";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 10;

function workData(assignment: { data: unknown }): AssignmentWorkData {
  return (assignment.data as AssignmentWorkData | null) ?? {};
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignment.type !== "PROJECT" && assignment.type !== "PRACTICE")
    return NextResponse.json({ error: "Not a gradable assignment" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0)
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });

  const existing = workData(assignment);
  const submissions = existing.submissions ?? [];
  if (submissions.length >= MAX_FILES)
    return NextResponse.json({ error: "Maximum number of files reached" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadAssignmentSubmission({
    assignmentId,
    filename: file.name,
    data: buffer,
    contentType: file.type || "application/octet-stream",
  });
  if (!uploaded)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });

  const entry = {
    id: randomUUID(),
    name: file.name,
    url: uploaded.url,
    storagePath: uploaded.storagePath,
    size: file.size,
    contentType: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
  };

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      data: { ...existing, submissions: [...submissions, entry] } as object,
    },
  });

  return NextResponse.json({ file: entry, data: updated.data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const fileId = new URL(req.url).searchParams.get("fileId");
  if (!fileId)
    return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignment.type !== "PROJECT" && assignment.type !== "PRACTICE")
    return NextResponse.json({ error: "Not a gradable assignment" }, { status: 400 });

  const existing = workData(assignment);
  const submissions = existing.submissions ?? [];
  const target = submissions.find((f) => f.id === fileId);
  if (!target)
    return NextResponse.json({ error: "File not found" }, { status: 404 });

  await deleteAssignmentSubmission(target.storagePath);

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      data: {
        ...existing,
        submissions: submissions.filter((f) => f.id !== fileId),
      } as object,
    },
  });

  return NextResponse.json({ ok: true, data: updated.data });
}
