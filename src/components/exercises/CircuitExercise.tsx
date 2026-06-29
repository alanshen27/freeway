"use client";
import { useEffect, useState } from "react";
import { Zap, X } from "lucide-react";

type Config = {
  goal: string;
  targetResistance: number;
  tolerance: number;
  palette: { label: string; ohms: number }[];
};

export function CircuitExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [placed, setPlaced] = useState<{ label: string; ohms: number }[]>([]);
  const total = placed.reduce((s, r) => s + r.ohms, 0);

  useEffect(() => {
    onChange({ total, combo: placed.map((p) => p.ohms) });
  }, [total, placed, onChange]);

  const close = Math.abs(total - cfg.targetResistance) <= (cfg.tolerance ?? 0.5);

  return (
    <div>
      <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-bold">
        <span>
          Target: <span className="text-accent">{cfg.targetResistance}Ω</span>
        </span>
        <span className={close ? "text-primary" : "text-muted-foreground"}>
          Current: {total}Ω
        </span>
      </div>

      {/* Circuit canvas */}
      <div className="mt-3 rounded-xl border-2 border-border bg-ink p-3">
        <svg viewBox="0 0 320 90" className="w-full">
          {/* battery */}
          <line x1="10" y1="45" x2="30" y2="45" stroke="#fff" strokeWidth="2" />
          <line x1="30" y1="30" x2="30" y2="60" stroke="#facc15" strokeWidth="4" />
          <line x1="38" y1="36" x2="38" y2="54" stroke="#facc15" strokeWidth="2" />
          {/* top wire */}
          <line x1="38" y1="45" x2="300" y2="45" stroke="#fff" strokeWidth="2" />
          {placed.length === 0 && (
            <text x="160" y="40" fill="#ffffff66" fontSize="11" textAnchor="middle">
              tap resistors below to add them in series
            </text>
          )}
          {placed.map((r, i) => {
            const x = 60 + i * 64;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={34}
                  width={48}
                  height={22}
                  rx={4}
                  fill="#1cb0f6"
                  className="cursor-pointer"
                  onClick={() => setPlaced((p) => p.filter((_, j) => j !== i))}
                />
                <text x={x + 24} y={49} fill="#fff" fontSize="11" textAnchor="middle">
                  {r.ohms}Ω
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {placed.length > 0 && (
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          tap a resistor to remove it
        </p>
      )}

      {/* Palette */}
      <div className="mt-3 flex flex-wrap gap-2">
        {cfg.palette.map((p, i) => (
          <button
            key={i}
            onClick={() => setPlaced((cur) => [...cur, p])}
            className="flex items-center gap-1.5 rounded-xl border-2 border-border bg-white px-3 py-2 text-sm font-bold active:scale-95"
          >
            <Zap className="size-4 text-lemon" /> {p.label}
          </button>
        ))}
        {placed.length > 0 && (
          <button
            onClick={() => setPlaced([])}
            className="flex items-center gap-1 rounded-xl border-2 border-border bg-white px-3 py-2 text-sm font-bold text-muted-foreground"
          >
            <X className="size-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
