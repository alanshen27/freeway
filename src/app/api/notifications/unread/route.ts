import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { hasUnreadNotifications } from "@/lib/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const hasUnread = await hasUnreadNotifications(user.id, user.notificationsSeenAt);
  return NextResponse.json({ hasUnread });
}
