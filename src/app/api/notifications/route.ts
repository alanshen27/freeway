import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const take = Number(new URL(req.url).searchParams.get("take")) || 8;
  const notifications = await getNotifications(user.id, user.notificationsSeenAt, take);
  return NextResponse.json({ notifications });
}
