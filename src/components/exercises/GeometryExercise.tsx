"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  checkGeometryConstraint,
  type GeoConstraint,
  type GeoPoint,
} from "@/lib/geometry";

type Config = {
  grid: { width: number; height: number; snap: number };
  points: GeoPoint[];
  polygon?: boolean;
  constraints: GeoConstraint[];
  hint?: string;
};

const CELL = 34;
const PAD = 24;

export function GeometryExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(cfg.points.map((p) => [p.id, { x: p.x, y: p.y }]))
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const w = cfg.grid.width * CELL + PAD * 2;
  const h = cfg.grid.height * CELL + PAD * 2;
  // Math coordinates are y-up; SVG is y-down.
  const toSvg = (p: { x: number; y: number }) => ({
    x: PAD + p.x * CELL,
    y: PAD + (cfg.grid.height - p.y) * CELL,
  });

  const checks = useMemo(() => {
    const pts = new Map(Object.entries(positions));
    const order = cfg.points.map((p) => p.id);
    return cfg.constraints.map((c) => checkGeometryConstraint(c, pts, order));
  }, [positions, cfg.points, cfg.constraints]);

  useEffect(() => {
    onChange({
      points: cfg.points
        .filter((p) => !p.fixed)
        .map((p) => ({ id: p.id, ...positions[p.id] })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * w;
    const sy = ((e.clientY - rect.top) / rect.height) * h;
    const snap = cfg.grid.snap || 1;
    const gx = Math.round((sx - PAD) / CELL / snap) * snap;
    const gy = Math.round((cfg.grid.height - (sy - PAD) / CELL) / snap) * snap;
    return {
      x: Math.max(0, Math.min(cfg.grid.width, gx)),
      y: Math.max(0, Math.min(cfg.grid.height, gy)),
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const p = pointFromEvent(e);
    if (p) setPositions((prev) => ({ ...prev, [dragging]: p }));
  }

  const ringSvg = cfg.points.map((p) => toSvg(positions[p.id]));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {checks.map((c, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              c.ok
                ? "border-mint/30 bg-mint-soft text-mint"
                : "border-border bg-white text-muted-foreground"
            )}
          >
            {c.ok ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            {c.label}
            <span className={cn("font-normal", c.ok ? "" : "text-blush")}>
              ({c.actual.toFixed(1)})
            </span>
          </span>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className="block w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
        >
          {/* Grid */}
          {Array.from({ length: cfg.grid.width + 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={PAD + i * CELL}
              y1={PAD}
              x2={PAD + i * CELL}
              y2={h - PAD}
              className="stroke-slate-100"
              strokeWidth={i === 0 ? 1.5 : 1}
            />
          ))}
          {Array.from({ length: cfg.grid.height + 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={PAD}
              y1={PAD + i * CELL}
              x2={w - PAD}
              y2={PAD + i * CELL}
              className="stroke-slate-100"
              strokeWidth={i === cfg.grid.height ? 1.5 : 1}
            />
          ))}

          {/* Shape */}
          {cfg.polygon && ringSvg.length >= 3 && (
            <polygon
              points={ringSvg.map((p) => `${p.x},${p.y}`).join(" ")}
              className="fill-brand-100/50 stroke-brand-400"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {!cfg.polygon &&
            ringSvg.length >= 2 &&
            ringSvg.slice(0, -1).map((p, i) => (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={ringSvg[i + 1].x}
                y2={ringSvg[i + 1].y}
                className="stroke-brand-400"
                strokeWidth={2}
              />
            ))}

          {/* Points */}
          {cfg.points.map((p) => {
            const pos = toSvg(positions[p.id]);
            const free = !p.fixed;
            return (
              <g
                key={p.id}
                onPointerDown={(e) => {
                  if (!free) return;
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  setDragging(p.id);
                }}
                className={free ? "cursor-grab" : undefined}
              >
                {free && dragging === p.id && (
                  <circle cx={pos.x} cy={pos.y} r={16} className="fill-primary/10" />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={free ? 9 : 7}
                  className={
                    free
                      ? "fill-primary stroke-white"
                      : "fill-slate-400 stroke-white"
                  }
                  strokeWidth={2}
                />
                <text
                  x={pos.x + 12}
                  y={pos.y - 10}
                  className="fill-foreground text-[13px] font-semibold"
                >
                  {p.id}
                </text>
                <text
                  x={pos.x + 12}
                  y={pos.y + 4}
                  className="fill-slate-400 text-[10px]"
                >
                  ({positions[p.id].x}, {positions[p.id].y})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Drag the colored points; gray points are fixed.
        </p>
        {cfg.hint && (
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <Lightbulb className="size-3.5" /> {showHint ? "Hide hint" : "Hint"}
          </button>
        )}
      </div>
      {showHint && cfg.hint && (
        <p className="mt-2 rounded-lg border border-lemon/30 bg-lemon-soft px-3 py-2 text-xs text-foreground">
          {cfg.hint}
        </p>
      )}
    </div>
  );
}
