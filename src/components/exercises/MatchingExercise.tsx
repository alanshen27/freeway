"use client";
import { useEffect, useMemo, useState } from "react";
import { ListPanel, ListRow } from "@/components/layout/Page";
import { InlineMarkdown } from "@/components/Markdown";

type Config = { left: string[]; right: string[] };

export function MatchingExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [mapping, setMapping] = useState<number[]>(
    Array(cfg.left.length).fill(-1)
  );

  const rightOptions = useMemo(
    () => cfg.right.map((label, idx) => ({ label, idx })),
    [cfg.right]
  );

  useEffect(() => {
    onChange({ mapping });
  }, [mapping, onChange]);

  return (
    <ListPanel>
      {cfg.left.map((l, i) => (
        <ListRow key={i} className="flex-wrap sm:flex-nowrap">
          <span className="min-w-0 flex-1 text-sm font-medium">
            <InlineMarkdown source={l} parentheticalMath />
          </span>
          <select
            value={mapping[i]}
            onChange={(e) =>
              setMapping((cur) => {
                const next = [...cur];
                next[i] = parseInt(e.target.value);
                return next;
              })
            }
            className="w-full max-w-xs rounded-md border border-input bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-auto"
          >
            <option value={-1}>Select match…</option>
            {rightOptions.map((r) => (
              <option key={r.idx} value={r.idx}>
                {r.label}
              </option>
            ))}
          </select>
        </ListRow>
      ))}
    </ListPanel>
  );
}
