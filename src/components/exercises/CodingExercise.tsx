"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Play, Lightbulb } from "lucide-react";
import { InlineMarkdown } from "@/components/Markdown";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center rounded-xl bg-ink text-sm text-white/60">
      Loading editor…
    </div>
  ),
});

type Config = {
  functionName: string;
  starterCode: string;
  tests: { args: unknown[]; expected: unknown }[];
  hints?: string[];
};

export function CodingExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [code, setCode] = useState(cfg.starterCode ?? "");
  const [output, setOutput] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(0);

  useEffect(() => {
    onChange({ code });
  }, [code, onChange]);

  function runLocal() {
    const lines: string[] = [];
    for (const t of cfg.tests) {
      try {
        // Client-side preview only; authoritative grading happens server-side.
        const fn = new Function(`${code}; return ${cfg.functionName};`)();
        const got = fn(...t.args);
        const ok = JSON.stringify(got) === JSON.stringify(t.expected);
        lines.push(
          `${ok ? "✓" : "✗"} ${cfg.functionName}(${t.args
            .map((a) => JSON.stringify(a))
            .join(", ")}) → ${JSON.stringify(got)}`
        );
      } catch (e) {
        lines.push(`✗ Error: ${(e as Error).message}`);
      }
    }
    setOutput(lines);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg">
        <Editor
          height="220px"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            padding: { top: 10 },
          }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={runLocal}
          className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-sm font-bold"
        >
          <Play className="size-4" /> Run tests
        </button>
        {cfg.hints && cfg.hints.length > 0 && (
          <button
            onClick={() => setShowHint((h) => Math.min(h + 1, cfg.hints!.length))}
            className="flex items-center gap-1.5 rounded-xl bg-lemon-soft px-3 py-1.5 text-sm font-bold text-amber-700"
          >
            <Lightbulb className="size-4" /> Hint
          </button>
        )}
      </div>
      {showHint > 0 && cfg.hints && (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {cfg.hints.slice(0, showHint).map((h, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">&bull;</span>
              <InlineMarkdown source={h} parentheticalMath />
            </li>
          ))}
        </ul>
      )}
      {output.length > 0 && (
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 font-mono text-xs text-white/90">
          {output.join("\n")}
        </pre>
      )}
    </div>
  );
}
