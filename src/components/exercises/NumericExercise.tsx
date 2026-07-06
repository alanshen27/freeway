"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { InlineMarkdown } from "@/components/Markdown";

type Config = { unit?: string; hint?: string };

export function NumericExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [raw, setRaw] = useState("");
  const [showHint, setShowHint] = useState(false);

  function update(v: string) {
    setRaw(v);
    const num = parseFloat(v.replace(",", "."));
    onChange(Number.isNaN(num) ? null : { value: num });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            inputMode="decimal"
            value={raw}
            onChange={(e) => update(e.target.value)}
            placeholder="0"
            className="h-14 w-44 rounded-xl border-2 border-border bg-white px-4 text-right font-mono text-2xl font-semibold text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        {cfg.unit && (
          <span className="text-lg font-medium text-muted-foreground">
            {cfg.unit}
          </span>
        )}
      </div>

      {cfg.hint && (
        <div className="mt-4">
          {showHint ? (
            <div className="flex items-start gap-2 rounded-lg bg-lemon-soft px-3 py-2 text-sm text-lemon">
              <Lightbulb className="mt-0.5 size-4 shrink-0" />
              <InlineMarkdown source={cfg.hint} parentheticalMath />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="size-3.5" />
              Show hint
            </button>
          )}
        </div>
      )}
    </div>
  );
}
