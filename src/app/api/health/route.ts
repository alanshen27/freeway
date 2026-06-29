import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { features } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe: verifies the DB connection and reports feature wiring. */
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  const status = db ? 200 : 503;
  return NextResponse.json(
    {
      status: db ? "ok" : "degraded",
      db,
      features: {
        auth: features.supabase ? "supabase" : features.demoSession ? "demo" : "unconfigured",
        llm: features.llm,
        queue: features.queue,
        storage: features.supabaseStorage,
      },
      time: new Date().toISOString(),
    },
    { status }
  );
}
