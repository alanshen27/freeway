import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { features } from "@/lib/env";
import { getCurrentUser, setSessionUser } from "@/lib/session";
import { INTERESTS } from "@/lib/catalog";

const schema = z.object({
  name: z.string().min(1).max(80),
  interests: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const current = await getCurrentUser();

  // In Supabase mode the request must be authenticated. Demo (cookie) onboarding
  // is only permitted in dev — never mint anonymous users in production.
  if (features.supabase && !current)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!features.supabase && !features.demoSession)
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 503 }
    );

  await prisma.interest.createMany({
    data: INTERESTS.map((i) => ({
      slug: i.slug,
      label: i.label,
      category: i.category,
    })),
    skipDuplicates: true,
  });

  // If signed in (Supabase), update that user; otherwise create a demo user.
  const user = current
    ? await prisma.user.update({
        where: { id: current.id },
        data: { name: body.data.name, onboarded: true },
      })
    : await prisma.user.create({
        data: { name: body.data.name, onboarded: true },
      });

  // Reset + set interests.
  await prisma.userInterest.deleteMany({ where: { userId: user.id } });
  if (body.data.interests.length) {
    const rows = await prisma.interest.findMany({
      where: { slug: { in: body.data.interests } },
    });
    await prisma.userInterest.createMany({
      data: rows.map((r) => ({ userId: user.id, interestId: r.id })),
      skipDuplicates: true,
    });
  }

  // Demo mode keeps a cookie session; Supabase mode is already authed.
  if (!current) await setSessionUser(user.id);

  return NextResponse.json({ user });
}
