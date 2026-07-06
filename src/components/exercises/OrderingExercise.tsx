"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { ListPanel } from "@/components/layout/Page";
import { InlineMarkdown } from "@/components/Markdown";

type Config = { items: string[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function OrderingExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const initial = useMemo(() => shuffle(cfg.items), [cfg.items]);
  const [order, setOrder] = useState<string[]>(initial);

  useEffect(() => {
    onChange({ sequence: order });
  }, [order, onChange]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    setOrder((cur) => {
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <ListPanel>
      {order.map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-2 px-4 py-3"
        >
          <GripVertical className="size-4 text-muted-foreground" />
          <span className="flex size-6 items-center justify-center rounded bg-secondary text-xs font-medium">
            {i + 1}
          </span>
          <span className="flex-1 text-sm">
            <InlineMarkdown source={item} parentheticalMath />
          </span>
          <div className="flex flex-col">
            <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="text-muted-foreground hover:text-foreground">
              <ChevronUp className="size-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="text-muted-foreground hover:text-foreground">
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </ListPanel>
  );
}
