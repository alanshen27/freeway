"use client";
import { useState } from "react";
import { Terminal } from "lucide-react";

type Config = { language?: string; code: string };

export function CodeOutputExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [output, setOutput] = useState("");

  function update(v: string) {
    setOutput(v);
    onChange(v.trim() ? { output: v } : null);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2 border-b border-slate-700/60 bg-[#0f172a] px-4 py-2">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-blush/70" />
            <span className="size-2.5 rounded-full bg-lemon/70" />
            <span className="size-2.5 rounded-full bg-mint/70" />
          </span>
          <span className="ml-1 text-xs font-medium text-slate-400">
            {cfg.language ?? "code"}
          </span>
        </div>
        <pre className="overflow-x-auto bg-[#1e293b] p-4 font-mono text-[0.8125rem] leading-relaxed text-slate-100">
          {cfg.code}
        </pre>
      </div>

      <label className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Terminal className="size-3.5" />
        What does this print?
      </label>
      <textarea
        value={output}
        onChange={(e) => update(e.target.value)}
        rows={2}
        spellCheck={false}
        placeholder="Type the exact output…"
        className="mt-1.5 w-full resize-y rounded-xl border-2 border-border bg-[#0f172a] px-4 py-3 font-mono text-sm text-mint placeholder:text-slate-500 focus:border-primary focus:outline-none"
      />
    </div>
  );
}
