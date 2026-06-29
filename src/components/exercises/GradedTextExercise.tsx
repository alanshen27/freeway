"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

type Config = { rubric: string[]; minWords: number };

export function GradedTextExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [text, setText] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    onChange({ text });
  }, [text, onChange]);

  return (
    <div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer… (graded by AI against the rubric)"
        className="min-h-32"
      />
      <div className="mt-1 flex items-center justify-between text-xs">
        <span
          className={words >= (cfg.minWords ?? 0) ? "text-primary" : "text-muted-foreground"}
        >
          {words}/{cfg.minWords} words
        </span>
        <span className="text-muted-foreground">{cfg.rubric?.length ?? 0} rubric points</span>
      </div>
      {cfg.rubric && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {cfg.rubric.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
