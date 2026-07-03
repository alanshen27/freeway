import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { saveSectionQuizScore } from "@/lib/section-progress";

const schema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sectionId } = await params;
  const result = await saveSectionQuizScore(
    user.id,
    sectionId,
    parsed.data.score,
    parsed.data.total
  );
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
