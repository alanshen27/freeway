import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  SHOP_BY_SLUG,
  parseHouseLayout,
  parseInventory,
  type PlacedItem,
} from "@/lib/gamification/shop";

const schema = z.object({
  layout: z.array(
    z.object({
      slug: z.string(),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
  ),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    layout: parseHouseLayout(fresh.houseLayout),
    inventory: parseInventory(fresh.inventory),
  });
}

/** Replace room layout; validates inventory has enough of each placed item. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });

  const layout = parsed.data.layout as PlacedItem[];

  for (const p of layout) {
    if (!SHOP_BY_SLUG[p.slug]) {
      return NextResponse.json({ error: `Unknown item: ${p.slug}` }, { status: 400 });
    }
  }

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inventory = parseInventory(fresh.inventory);
  const needed = new Map<string, number>();
  for (const p of layout) {
    needed.set(p.slug, (needed.get(p.slug) ?? 0) + 1);
  }
  for (const [slug, count] of needed) {
    const have = inventory.find((e) => e.slug === slug)?.qty ?? 0;
    if (have < count) {
      return NextResponse.json(
        { error: `Not enough ${SHOP_BY_SLUG[slug]?.name ?? slug} in inventory` },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { houseLayout: layout as object },
  });

  return NextResponse.json({ ok: true, layout });
}
