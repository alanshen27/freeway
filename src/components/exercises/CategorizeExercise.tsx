"use client";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Item = { label: string; category: number };
type Config = { categories: string[]; items: Item[] };

function shuffleIdx(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BUCKET_STYLES = [
  { chip: "bg-brand-50 text-brand-700 ring-brand-100", ring: "ring-brand-200" },
  { chip: "bg-sky-soft text-sky ring-sky/20", ring: "ring-sky/30" },
  { chip: "bg-lemon-soft text-lemon ring-lemon/20", ring: "ring-lemon/30" },
];

export function CategorizeExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  // Stable shuffled presentation order (answers map back to original indices).
  const order = useMemo(() => shuffleIdx(cfg.items.length), [cfg.items.length]);
  const [assigned, setAssigned] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (Object.keys(assigned).length === cfg.items.length) {
      onChange({
        assignments: cfg.items.map((_, i) => assigned[i]),
      });
    } else {
      onChange(null);
    }
  }, [assigned, cfg.items, onChange]);

  const unassigned = order.filter((i) => assigned[i] === undefined);

  function drop(bucket: number) {
    if (selected === null) return;
    setAssigned((a) => ({ ...a, [selected]: bucket }));
    setSelected(null);
  }

  function unassign(itemIdx: number) {
    setAssigned((a) => {
      const next = { ...a };
      delete next[itemIdx];
      return next;
    });
  }

  return (
    <div>
      {unassigned.length > 0 && (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Tap an item, then tap its bucket.
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(selected === i ? null : i)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  selected === i
                    ? "border-primary bg-brand-50 text-brand-700 shadow-sm"
                    : "border-border bg-white text-foreground hover:border-slate-300"
                )}
              >
                {cfg.items[i].label}
              </button>
            ))}
          </div>
        </>
      )}

      <div
        className={cn(
          "mt-4 grid gap-3",
          cfg.categories.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
        )}
      >
        {cfg.categories.map((cat, b) => {
          const style = BUCKET_STYLES[b % BUCKET_STYLES.length];
          const contents = cfg.items
            .map((it, i) => ({ it, i }))
            .filter(({ i }) => assigned[i] === b);
          return (
            <button
              key={b}
              type="button"
              onClick={() => drop(b)}
              disabled={selected === null && contents.length === 0}
              className={cn(
                "min-h-28 rounded-xl border-2 border-dashed p-3 text-left transition-all",
                selected !== null
                  ? cn("cursor-pointer border-primary/60 bg-brand-50/40 ring-2", style.ring)
                  : "border-border bg-slate-50/50"
              )}
            >
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  style.chip
                )}
              >
                {cat}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {contents.map(({ it, i }) => (
                  <span
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      unassign(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        unassign(i);
                      }
                    }}
                    title="Tap to remove"
                    className="rounded-md bg-white px-2 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-border hover:ring-blush/50"
                  >
                    {it.label}
                  </span>
                ))}
                {contents.length === 0 && (
                  <span className="text-xs text-muted-foreground/60">Empty</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
