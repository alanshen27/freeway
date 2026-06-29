"use client";
import { useEffect, useState } from "react";

type Config = {
  kind: "lever" | "vector-sum" | "projectile" | "gear-ratio";
  target: Record<string, number>;
  prompt?: string;
};

export function VisualExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  if (cfg.kind === "vector-sum") return <VectorSum cfg={cfg} onChange={onChange} />;
  if (cfg.kind === "projectile") return <Projectile cfg={cfg} onChange={onChange} />;
  if (cfg.kind === "gear-ratio") return <GearRatio cfg={cfg} onChange={onChange} />;
  return <Lever cfg={cfg} onChange={onChange} />;
}

/** Projectile: tune launch angle + speed to land on the target distance. */
function Projectile({ cfg, onChange }: { cfg: Config; onChange: (a: unknown) => void }) {
  const g = 9.81;
  const targetDist = cfg.target.distance ?? 10;
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(8);
  const range = (speed * speed * Math.sin((2 * angle * Math.PI) / 180)) / g;

  useEffect(() => {
    onChange({ range });
  }, [range, onChange]);

  // Build a parabolic path scaled to the SVG.
  const maxX = Math.max(range, targetDist) * 1.15 || 1;
  const W = 300;
  const H = 130;
  const sx = (W - 20) / maxX;
  const rad = (angle * Math.PI) / 180;
  const flight = (2 * speed * Math.sin(rad)) / g;
  const pts: string[] = [];
  for (let t = 0; t <= flight; t += flight / 24) {
    const x = speed * Math.cos(rad) * t;
    const y = speed * Math.sin(rad) * t - 0.5 * g * t * t;
    pts.push(`${10 + x * sx},${H - 12 - Math.max(0, y) * sx}`);
  }
  const targetX = 10 + targetDist * sx;

  return (
    <div>
      <div className="rounded-2xl border border-border bg-ink p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <line x1="0" y1={H - 12} x2={W} y2={H - 12} stroke="#ffffff22" />
          <circle cx={targetX} cy={H - 12} r="6" fill="#f2647d" />
          <polyline points={pts.join(" ")} fill="none" stroke="#3b5bf6" strokeWidth="2" />
          <circle cx="10" cy={H - 12} r="4" fill="#36b3f5" />
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        target {targetDist}m · your range {range.toFixed(1)}m
      </p>
      <Slider label={`Angle ${angle}°`} min={10} max={80} step={1} value={angle} set={setAngle} />
      <Slider label={`Speed ${speed.toFixed(1)} m/s`} min={3} max={14} step={0.1} value={speed} set={setSpeed} />
    </div>
  );
}

/** Gear ratio: pick the driven-gear teeth to hit a target ratio. */
function GearRatio({ cfg, onChange }: { cfg: Config; onChange: (a: unknown) => void }) {
  const driver = cfg.target.driverTeeth ?? 12;
  const targetRatio = cfg.target.ratio ?? 2;
  const [driven, setDriven] = useState(12);
  const ratio = driven / driver;

  useEffect(() => {
    onChange({ ratio });
  }, [ratio, onChange]);

  return (
    <div>
      <div className="flex items-center justify-center gap-6 rounded-2xl border border-border bg-secondary/40 p-4">
        <Gear teeth={driver} r={26} label={`${driver}T`} color="#3b5bf6" />
        <Gear teeth={driven} r={26 * Math.min(2, ratio || 1)} label={`${driven}T`} color="#f3743b" />
      </div>
      <p className="mt-1 text-center text-sm font-semibold">
        ratio {ratio.toFixed(2)} : 1{" "}
        <span className="text-muted-foreground">(target {targetRatio})</span>
      </p>
      <Slider
        label={`Driven gear teeth: ${driven}`}
        min={6}
        max={48}
        step={1}
        value={driven}
        set={setDriven}
      />
    </div>
  );
}

function Gear({ teeth, r, label, color }: { teeth: number; r: number; label: string; color: string }) {
  const spikes = Math.min(teeth, 24);
  const pts: string[] = [];
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.82;
    pts.push(`${40 + Math.cos(a) * rr},${40 + Math.sin(a) * rr}`);
  }
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <polygon points={pts.join(" ")} fill={color} />
      <circle cx="40" cy="40" r={r * 0.35} fill="#fff" />
      <text x="40" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {label}
      </text>
    </svg>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  set,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  set: (n: number) => void;
}) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#3b5bf6]"
      />
    </label>
  );
}

/** Lever: left load is fixed; balance it by positioning the right mass. */
function Lever({ cfg, onChange }: { cfg: Config; onChange: (a: unknown) => void }) {
  const leftTorque = cfg.target.torque ?? 12;
  const leftMass = 6;
  const leftDist = leftTorque / leftMass;
  const rightMass = 4;
  const [dist, setDist] = useState(1);
  const rightTorque = rightMass * dist;
  const net = leftTorque - rightTorque; // 0 => balanced
  const tilt = Math.max(-12, Math.min(12, net * 2));

  useEffect(() => {
    onChange({ distance: dist });
  }, [dist, onChange]);

  return (
    <div>
      <div className="rounded-xl border-2 border-border bg-secondary/40 p-3">
        <svg viewBox="0 0 300 140" className="w-full">
          {/* fulcrum */}
          <polygon points="150,120 135,140 165,140" fill="#777" />
          <g transform={`rotate(${tilt} 150 118)`}>
            <rect x="20" y="114" width="260" height="8" rx="4" fill="#4b4b4b" />
            {/* left mass */}
            <rect x={150 - leftDist * 36 - 16} y="88" width="32" height="26" rx="4" fill="#ec4899" />
            <text x={150 - leftDist * 36} y="104" fontSize="10" fill="#fff" textAnchor="middle">
              {leftMass}kg
            </text>
            {/* right mass */}
            <rect x={150 + dist * 36 - 16} y="88" width="32" height="26" rx="4" fill="#1cb0f6" />
            <text x={150 + dist * 36} y="104" fontSize="10" fill="#fff" textAnchor="middle">
              {rightMass}kg
            </text>
          </g>
        </svg>
        <p className="text-center text-sm font-bold">
          {Math.abs(net) < 0.25 ? (
            <span className="text-primary">Balanced! ⚖️</span>
          ) : (
            <span className="text-muted-foreground">
              {net > 0 ? "Left side heavier" : "Right side heavier"}
            </span>
          )}
        </p>
      </div>
      <label className="mt-3 block text-sm font-bold">
        Right mass distance: {dist.toFixed(1)} m
      </label>
      <input
        type="range"
        min={0.5}
        max={5}
        step={0.1}
        value={dist}
        onChange={(e) => setDist(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#3b5bf6]"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Left: {leftMass}kg at {leftDist}m. Match the torque.
      </p>
    </div>
  );
}

/** Vector sum: tune two vectors so their resultant matches the target. */
function VectorSum({ cfg, onChange }: { cfg: Config; onChange: (a: unknown) => void }) {
  const tx = cfg.target.x ?? 3;
  const ty = cfg.target.y ?? 4;
  const [a, setA] = useState({ m: 2, deg: 0 });
  const [b, setB] = useState({ m: 2, deg: 90 });
  const ax = a.m * Math.cos((a.deg * Math.PI) / 180);
  const ay = a.m * Math.sin((a.deg * Math.PI) / 180);
  const bx = b.m * Math.cos((b.deg * Math.PI) / 180);
  const by = b.m * Math.sin((b.deg * Math.PI) / 180);
  const rx = ax + bx;
  const ry = ay + by;

  useEffect(() => {
    onChange({ x: rx, y: ry });
  }, [rx, ry, onChange]);

  const O = { x: 150, y: 130 };
  const S = 18; // px per unit
  const p = (x: number, y: number) => `${O.x + x * S},${O.y - y * S}`;

  return (
    <div>
      <div className="rounded-xl border-2 border-border bg-ink p-2">
        <svg viewBox="0 0 300 150" className="w-full">
          <line x1="0" y1={O.y} x2="300" y2={O.y} stroke="#ffffff22" />
          <line x1={O.x} y1="0" x2={O.x} y2="150" stroke="#ffffff22" />
          <Arrow from={p(0, 0)} to={p(tx, ty)} color="#22c55e" dashed />
          <Arrow from={p(0, 0)} to={p(ax, ay)} color="#ec4899" />
          <Arrow from={p(ax, ay)} to={p(rx, ry)} color="#1cb0f6" />
          <Arrow from={p(0, 0)} to={p(rx, ry)} color="#ffffff" />
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        target ({tx}, {ty}) · yours ({rx.toFixed(1)}, {ry.toFixed(1)})
      </p>
      <VecControls label="Vector A" v={a} set={setA} color="#ec4899" />
      <VecControls label="Vector B" v={b} set={setB} color="#1cb0f6" />
    </div>
  );
}

function VecControls({
  label,
  v,
  set,
  color,
}: {
  label: string;
  v: { m: number; deg: number };
  set: (v: { m: number; deg: number }) => void;
  color: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-sm font-bold">
        <span className="size-3 rounded-full" style={{ background: color }} /> {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          length {v.m.toFixed(1)}
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={v.m}
            onChange={(e) => set({ ...v, m: parseFloat(e.target.value) })}
            className="w-full accent-[#1cb0f6]"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          angle {v.deg}°
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={v.deg}
            onChange={(e) => set({ ...v, deg: parseInt(e.target.value) })}
            className="w-full accent-[#1cb0f6]"
          />
        </label>
      </div>
    </div>
  );
}

function Arrow({
  from,
  to,
  color,
  dashed,
}: {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
}) {
  const [fx, fy] = from.split(",").map(Number);
  const [tx, ty] = to.split(",").map(Number);
  const ang = Math.atan2(ty - fy, tx - fx);
  const head = 7;
  return (
    <g>
      <line
        x1={fx}
        y1={fy}
        x2={tx}
        y2={ty}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {!dashed && (
        <polygon
          points={`${tx},${ty} ${tx - head * Math.cos(ang - 0.4)},${
            ty - head * Math.sin(ang - 0.4)
          } ${tx - head * Math.cos(ang + 0.4)},${ty - head * Math.sin(ang + 0.4)}`}
          fill={color}
        />
      )}
    </g>
  );
}
