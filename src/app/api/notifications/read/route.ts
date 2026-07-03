import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { markNotificationsSeen } from "@/lib/notifications";

const schema = z.object({
  at: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const at = parsed.success && parsed.data.at ? new Date(parsed.data.at) : new Date();
  const seenAt = await markNotificationsSeen(user.id, at);

  return NextResponse.json({ ok: true, seenAt: seenAt.toISOString() });
}
