import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  SHOP_BY_SLUG,
  addToInventory,
  parseInventory,
} from "@/lib/gamification/shop";

const schema = z.object({ slug: z.string() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const item = SHOP_BY_SLUG[parsed.data.slug];
  if (!item)
    return NextResponse.json({ error: "Unknown item" }, { status: 404 });

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (fresh.coins < item.price) {
    return NextResponse.json(
      { error: `Need ${item.price} coins (you have ${fresh.coins})` },
      { status: 400 }
    );
  }

  const inventory = addToInventory(parseInventory(fresh.inventory), item.slug);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      coins: { decrement: item.price },
      inventory: inventory as object,
    },
    select: { coins: true, inventory: true },
  });

  return NextResponse.json({ ok: true, coins: updated.coins, inventory: updated.inventory });
}
