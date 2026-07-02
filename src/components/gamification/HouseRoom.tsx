"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SHOP_BY_SLUG,
  type InventoryEntry,
  type PlacedItem,
} from "@/lib/gamification/shop";

export function HouseRoom({
  initialLayout,
  inventory,
}: {
  initialLayout: PlacedItem[];
  inventory: InventoryEntry[];
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<PlacedItem[]>(initialLayout);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const placedCounts = layout.reduce(
    (acc, p) => {
      acc[p.slug] = (acc[p.slug] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function available(slug: string) {
    const owned = inventory.find((i) => i.slug === slug)?.qty ?? 0;
    return owned - (placedCounts[slug] ?? 0);
  }

  function placeAt(x: number, y: number) {
    if (!selected || available(selected) <= 0) return;
    setLayout((prev) => [...prev, { slug: selected, x, y }]);
    setSelected(null);
  }

  function removeAt(index: number) {
    setLayout((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/house", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMsg("Room saved!");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div>
        <div
          className="relative aspect-[4/3] cursor-crosshair overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-sky-100 to-amber-50 shadow-card"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
            const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
            placeAt(x, y);
          }}
        >
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-200/80 to-transparent" />
          <div className="absolute bottom-[18%] left-[8%] right-[8%] h-0.5 rounded-full bg-amber-300/60" />

          {layout.map((p, i) => {
            const item = SHOP_BY_SLUG[p.slug];
            return (
              <button
                key={`${p.slug}-${i}`}
                type="button"
                className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-sm transition-transform hover:scale-110 sm:text-4xl"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                title={item?.name ?? p.slug}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
              >
                {item?.emoji ?? "📦"}
              </button>
            );
          })}

          {selected && (
            <p className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
              Tap the room to place {SHOP_BY_SLUG[selected]?.emoji}{" "}
              {SHOP_BY_SLUG[selected]?.name}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" disabled={busy} onClick={save}>
            <Save className="size-4" />
            {busy ? "Saving…" : "Save room"}
          </Button>
          <Button
            type="button"
            variant="duoOutline"
            size="sm"
            onClick={() => setLayout([])}
          >
            <Trash2 className="size-3.5" />
            Clear all
          </Button>
          {msg && (
            <span className="text-xs text-muted-foreground">{msg}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Select an item from your inventory, tap the room to place it. Tap a placed
          item to remove it.
        </p>
      </div>

      <aside className="rounded-xl border border-border bg-white p-4 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Inventory</h3>
        {inventory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing yet.{" "}
            <Link href="/shop" className="font-medium text-primary hover:underline">
              Visit the shop
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {inventory.map((entry) => {
              const item = SHOP_BY_SLUG[entry.slug];
              const left = available(entry.slug);
              return (
                <li key={entry.slug}>
                  <button
                    type="button"
                    disabled={left <= 0}
                    onClick={() =>
                      setSelected(selected === entry.slug ? null : entry.slug)
                    }
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                      selected === entry.slug
                        ? "border-primary bg-brand-50"
                        : "border-border hover:bg-secondary/50"
                    } ${left <= 0 ? "opacity-40" : ""}`}
                  >
                    <span className="text-xl">{item?.emoji}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item?.name ?? entry.slug}
                    </span>
                    <span className="text-xs text-muted-foreground">{left} left</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
