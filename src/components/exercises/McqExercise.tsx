"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Config = { choices: string[] };

export function McqExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {cfg.choices.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            setPicked(i);
            onChange({ choiceIndex: i });
          }}
          className={cn(
            "w-full px-4 py-3 text-left text-sm transition-colors",
            picked === i
              ? "bg-brand-50 font-medium text-brand-700"
              : "hover:bg-secondary/50"
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
