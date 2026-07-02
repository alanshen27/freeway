"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Force = { id: string; label: string; angleDeg: number; required: boolean };
type Config = {
  scene: "flat" | "incline" | "hanging";
  inclineDeg?: number;
  forces: Force[];
  toleranceDeg?: number;
};

const W = 440;
const H = 340;
const CX = W / 2;
const CY = H / 2 + 10;
const ARROW_LEN = 92;
const SNAP_DEG = 5;

const FORCE_COLORS = [
  { stroke: "stroke-sky", fill: "fill-sky", chip: "border-sky/40 bg-sky-soft text-sky" },
  { stroke: "stroke-blush", fill: "fill-blush", chip: "border-blush/40 bg-blush-soft text-blush" },
  { stroke: "stroke-mint", fill: "fill-mint", chip: "border-mint/40 bg-mint-soft text-mint" },
  { stroke: "stroke-lemon", fill: "fill-lemon", chip: "border-lemon/40 bg-lemon-soft text-lemon" },
  { stroke: "stroke-brand-500", fill: "fill-brand-500", chip: "border-brand-200 bg-brand-50 text-brand-700" },
];

/** Math angle (degrees, CCW from +x) to SVG endpoint around the body center. */
function tip(angleDeg: number, len = ARROW_LEN) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * len, y: CY - Math.sin(rad) * len };
}

export function FreeBodyExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const svgRef = useRef<SVGSVGElement>(null);
  // Placed forces start pointing right; the learner aims them.
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [rotating, setRotating] = useState<string | null>(null);

  useEffect(() => {
    const entries = Object.entries(placed);
    onChange(
      entries.length > 0
        ? { placed: entries.map(([id, angleDeg]) => ({ id, angleDeg })) }
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  function toggle(id: string) {
    setPlaced((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = 0;
      return next;
    });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!rotating) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const sy = ((e.clientY - rect.top) / rect.height) * H;
    const raw = (Math.atan2(CY - sy, sx - CX) * 180) / Math.PI;
    const snapped = ((Math.round(raw / SNAP_DEG) * SNAP_DEG) + 360) % 360;
    setPlaced((prev) => ({ ...prev, [rotating]: snapped }));
  }

  const incline = cfg.inclineDeg ?? 30;
  const colorFor = (id: string) =>
    FORCE_COLORS[cfg.forces.findIndex((f) => f.id === id) % FORCE_COLORS.length];

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">
        Which forces act on the body? Add them, then drag each arrowhead to aim it.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {cfg.forces.map((f) => {
          const active = f.id in placed;
          const color = colorFor(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                active
                  ? color.chip
                  : "border-border bg-white text-foreground hover:border-slate-300"
              )}
            >
              {active ? "− " : "+ "}
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => setRotating(null)}
          onPointerLeave={() => setRotating(null)}
        >
          {/* Scene */}
          {cfg.scene === "flat" && (
            <>
              <line
                x1={40}
                y1={CY + 28}
                x2={W - 40}
                y2={CY + 28}
                className="stroke-slate-300"
                strokeWidth={3}
              />
              <rect
                x={CX - 28}
                y={CY - 28}
                width={56}
                height={56}
                rx={6}
                className="fill-slate-100 stroke-slate-400"
                strokeWidth={2}
              />
            </>
          )}
          {cfg.scene === "incline" && (
            <g transform={`rotate(${-incline} ${CX} ${CY + 28})`}>
              <line
                x1={CX - 170}
                y1={CY + 28}
                x2={CX + 170}
                y2={CY + 28}
                className="stroke-slate-300"
                strokeWidth={3}
              />
              <rect
                x={CX - 28}
                y={CY - 28}
                width={56}
                height={56}
                rx={6}
                className="fill-slate-100 stroke-slate-400"
                strokeWidth={2}
              />
            </g>
          )}
          {cfg.scene === "hanging" && (
            <>
              <line
                x1={60}
                y1={44}
                x2={W - 60}
                y2={44}
                className="stroke-slate-300"
                strokeWidth={3}
              />
              <line
                x1={CX}
                y1={44}
                x2={CX}
                y2={CY - 28}
                className="stroke-slate-400"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <rect
                x={CX - 28}
                y={CY - 28}
                width={56}
                height={56}
                rx={6}
                className="fill-slate-100 stroke-slate-400"
                strokeWidth={2}
              />
            </>
          )}
          {cfg.scene === "incline" && (
            <text x={44} y={H - 20} className="fill-slate-400 text-[11px]">
              incline: {incline}°
            </text>
          )}

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={4} className="fill-slate-500" />

          {/* Force arrows */}
          {Object.entries(placed).map(([id, angle]) => {
            const f = cfg.forces.find((cf) => cf.id === id);
            if (!f) return null;
            const color = colorFor(id);
            const end = tip(angle);
            const labelPos = tip(angle, ARROW_LEN + 26);
            const rad = (angle * Math.PI) / 180;
            const headA = {
              x: end.x - 12 * Math.cos(rad - 0.42),
              y: end.y + 12 * Math.sin(rad - 0.42),
            };
            const headB = {
              x: end.x - 12 * Math.cos(rad + 0.42),
              y: end.y + 12 * Math.sin(rad + 0.42),
            };
            return (
              <g key={id}>
                <line
                  x1={CX}
                  y1={CY}
                  x2={end.x}
                  y2={end.y}
                  strokeWidth={3}
                  className={color.stroke}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${end.x},${end.y} ${headA.x},${headA.y} ${headB.x},${headB.y}`}
                  className={color.fill}
                />
                {/* Drag handle */}
                <circle
                  cx={end.x}
                  cy={end.y}
                  r={14}
                  className="cursor-grab fill-transparent"
                  onPointerDown={(e) => {
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                    setRotating(id);
                  }}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-[11px] font-semibold"
                >
                  {f.label.split(" ")[0]} {angle}°
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Angles are measured counterclockwise from the right: 90° is up, 270° is down.
      </p>
    </div>
  );
}
