import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { markSectionComplete, resetSectionProgress } from "@/lib/section-progress";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { sectionId } = await params;
  const result = await markSectionComplete(user.id, sectionId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, ...result });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { sectionId } = await params;
  const result = await resetSectionProgress(user.id, sectionId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, ...result });
}
