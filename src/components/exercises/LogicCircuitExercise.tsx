"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GateType = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR";
type Gate = { type: GateType; in: (string | null)[] };
type Config = {
  inputs: string[];
  outputs: number[];
  expression?: string;
  availableGates: GateType[];
  maxGates?: number;
};

const GATE_HELP: Record<GateType, string> = {
  AND: "1 only when both inputs are 1",
  OR: "1 when at least one input is 1",
  NOT: "flips its single input",
  XOR: "1 when the inputs differ",
  NAND: "opposite of AND",
  NOR: "opposite of OR",
};

function evalGate(type: GateType, a: number, b: number): number {
  switch (type) {
    case "AND":
      return a & b;
    case "OR":
      return a | b;
    case "XOR":
      return a ^ b;
    case "NAND":
      return 1 - (a & b);
    case "NOR":
      return 1 - (a | b);
    case "NOT":
      return 1 - a;
  }
}

export function LogicCircuitExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const maxGates = cfg.maxGates ?? 5;
  const [gates, setGates] = useState<Gate[]>([]);
  const [outputRef, setOutputRef] = useState<string | null>(null);

  const complete =
    gates.length > 0 &&
    outputRef !== null &&
    gates.every((g) => g.in.every((r) => r !== null));

  // Evaluate every truth-table row with the current (possibly partial) circuit.
  const rowResults = useMemo(() => {
    const rows = 1 << cfg.inputs.length;
    const out: (number | null)[] = [];
    for (let row = 0; row < rows; row++) {
      if (!complete) {
        out.push(null);
        continue;
      }
      const inputVals: Record<string, number> = {};
      cfg.inputs.forEach((name, i) => {
        inputVals[name] = (row >> (cfg.inputs.length - 1 - i)) & 1;
      });
      const gateVals: number[] = [];
      for (const g of gates) {
        const resolve = (ref: string | null): number => {
          if (ref === null) return 0;
          if (ref in inputVals) return inputVals[ref];
          return gateVals[Number(ref.slice(1))] ?? 0;
        };
        gateVals.push(
          evalGate(g.type, resolve(g.in[0]), g.type === "NOT" ? 0 : resolve(g.in[1]))
        );
      }
      const m = /^g(\d+)$/.exec(outputRef!);
      out.push(m ? gateVals[Number(m[1])] : inputVals[outputRef!] ?? 0);
    }
    return out;
  }, [cfg.inputs, gates, outputRef, complete]);

  const allMatch =
    complete && rowResults.every((r, i) => r === cfg.outputs[i]);

  useEffect(() => {
    if (complete) {
      onChange({
        gates: gates.map((g) => ({
          type: g.type,
          in: g.type === "NOT" ? [g.in[0]] : g.in,
        })),
        output: outputRef,
      });
    } else {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gates, outputRef, complete]);

  function addGate(type: GateType) {
    if (gates.length >= maxGates) return;
    setGates((g) => [...g, { type, in: type === "NOT" ? [null] : [null, null] }]);
  }

  function removeGate(idx: number) {
    setGates((prev) => {
      // Drop the gate and clear any wires that referenced it (or later gates).
      const next = prev
        .filter((_, i) => i !== idx)
        .map((g) => ({
          ...g,
          in: g.in.map((r) => {
            const m = r ? /^g(\d+)$/.exec(r) : null;
            if (!m) return r;
            const ref = Number(m[1]);
            if (ref === idx) return null;
            return ref > idx ? `g${ref - 1}` : r;
          }),
        }));
      return next;
    });
    setOutputRef((o) => {
      const m = o ? /^g(\d+)$/.exec(o) : null;
      if (!m) return o;
      const ref = Number(m[1]);
      if (ref === idx) return null;
      return ref > idx ? `g${ref - 1}` : o;
    });
  }

  function setWire(gateIdx: number, port: number, ref: string) {
    setGates((prev) =>
      prev.map((g, i) =>
        i === gateIdx
          ? { ...g, in: g.in.map((r, pi) => (pi === port ? ref || null : r)) }
          : g
      )
    );
  }

  // Sources a gate may use: circuit inputs plus any earlier gate.
  const sourcesFor = (gateIdx: number) => [
    ...cfg.inputs,
    ...gates.slice(0, gateIdx).map((_, i) => `g${i}`),
  ];

  const refLabel = (ref: string) =>
    /^g\d+$/.test(ref) ? `${gates[Number(ref.slice(1))]?.type} #${Number(ref.slice(1)) + 1}` : ref;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
      <div>
        {cfg.expression && (
          <p className="mb-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
            Target expression:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.85em] font-semibold">
              {cfg.expression}
            </code>
          </p>
        )}
        <p className="text-xs font-medium text-muted-foreground">
          Add gates ({gates.length}/{maxGates})
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {cfg.availableGates.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addGate(t)}
              disabled={gates.length >= maxGates}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <Plus className="size-3" /> {t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {gates.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              No gates yet — add one above, then wire its inputs.
            </p>
          )}
          {gates.map((g, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                outputRef === `g${i}`
                  ? "border-primary bg-brand-50/60"
                  : "border-border bg-white"
              )}
            >
              <span className="w-20 shrink-0 font-semibold">
                {g.type} <span className="text-xs text-muted-foreground">#{i + 1}</span>
              </span>
              {g.in.map((r, port) => (
                <select
                  key={port}
                  value={r ?? ""}
                  onChange={(e) => setWire(i, port, e.target.value)}
                  className="rounded-md border border-border bg-white px-2 py-1 text-xs"
                >
                  <option value="">
                    {g.type === "NOT" ? "input…" : port === 0 ? "input 1…" : "input 2…"}
                  </option>
                  {sourcesFor(i).map((s) => (
                    <option key={s} value={s}>
                      {refLabel(s)}
                    </option>
                  ))}
                </select>
              ))}
              <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="circuit-output"
                  checked={outputRef === `g${i}`}
                  onChange={() => setOutputRef(`g${i}`)}
                />
                Output
              </label>
              <button
                type="button"
                onClick={() => removeGate(i)}
                className="action-danger rounded-md p-1"
                aria-label={`Remove gate ${i + 1}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        {complete && (
          <p
            className={cn(
              "mt-3 text-xs font-medium",
              allMatch ? "text-mint" : "text-muted-foreground"
            )}
          >
            {allMatch
              ? "Every truth-table row matches — submit your circuit!"
              : "Circuit wired — compare its output column against the target."}
          </p>
        )}
      </div>

      <div className="lg:w-64">
        <p className="text-xs font-medium text-muted-foreground">Target truth table</p>
        <table className="mt-2 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-border text-center text-xs">
          <thead>
            <tr className="bg-slate-50">
              {cfg.inputs.map((n) => (
                <th key={n} className="border-b border-border px-2 py-1.5 font-semibold">
                  {n}
                </th>
              ))}
              <th className="border-b border-l border-border px-2 py-1.5 font-semibold">
                Target
              </th>
              <th className="border-b border-border px-2 py-1.5 font-semibold">Yours</th>
            </tr>
          </thead>
          <tbody>
            {cfg.outputs.map((expected, row) => {
              const got = rowResults[row];
              const match = got !== null && got === expected;
              return (
                <tr key={row} className={match ? "bg-mint-soft/50" : undefined}>
                  {cfg.inputs.map((n, i) => (
                    <td key={n} className="px-2 py-1 text-muted-foreground">
                      {(row >> (cfg.inputs.length - 1 - i)) & 1}
                    </td>
                  ))}
                  <td className="border-l border-border px-2 py-1 font-semibold">
                    {expected}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1 font-semibold",
                      got === null
                        ? "text-muted-foreground/40"
                        : match
                          ? "text-mint"
                          : "text-blush"
                    )}
                  >
                    {got ?? "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          {cfg.availableGates.map((t) => (
            <li key={t}>
              <span className="font-semibold text-foreground">{t}</span> — {GATE_HELP[t]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
