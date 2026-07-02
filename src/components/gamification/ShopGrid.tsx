"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coins, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHOP_ITEMS, type ShopItem } from "@/lib/gamification/shop";

export function ShopGrid({
  coins,
  inventory,
}: {
  coins: number;
  inventory: { slug: string; qty: number }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(item: ShopItem) {
    setBusy(item.slug);
    setError(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const owned = (slug: string) => inventory.find((i) => i.slug === slug)?.qty ?? 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Coins className="size-4 text-lemon" />
          {coins} coins available
        </p>
        <Link
          href="/house"
          className="text-sm font-medium text-primary hover:underline"
        >
          Go to your room →
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-blush/30 bg-blush-soft px-3 py-2 text-sm text-blush">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_ITEMS.map((item) => {
          const have = owned(item.slug);
          const canAfford = coins >= item.price;
          return (
            <article
              key={item.slug}
              className="flex flex-col rounded-xl border border-border bg-white p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-12 items-center justify-center rounded-lg bg-slate-50 text-2xl">
                  {item.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  {have > 0 && (
                    <p className="mt-1 text-xs font-medium text-mint">Owned ×{have}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{item.price} coins</span>
                <Button
                  type="button"
                  size="sm"
                  variant={canAfford ? "default" : "duoOutline"}
                  disabled={!canAfford || busy === item.slug}
                  onClick={() => buy(item)}
                >
                  <ShoppingBag className="size-3.5" />
                  {busy === item.slug ? "Buying…" : "Buy"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Earn coins by completing lessons (+5), exercises (+10), and assignments (+15).
        Each coin comes from XP you earn while learning.
      </p>
    </div>
  );
}
