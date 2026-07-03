import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { searchUserContent } from "@/lib/global-search";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const groups = await searchUserContent(user.id, q);

  return NextResponse.json({ groups });
}
