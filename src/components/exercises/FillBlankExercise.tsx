"use client";
import { useEffect, useMemo, useState } from "react";

type Config = { template: string; answers: string[] };

export function FillBlankExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const parts = useMemo(() => cfg.template.split("___"), [cfg.template]);
  const blanks = parts.length - 1;
  const [values, setValues] = useState<string[]>(Array(blanks).fill(""));

  useEffect(() => {
    onChange({ values });
  }, [values, onChange]);

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-loose">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < blanks && (
            <input
              value={values[i] ?? ""}
              onChange={(e) =>
                setValues((cur) => {
                  const next = [...cur];
                  next[i] = e.target.value;
                  return next;
                })
              }
              className="mx-1 w-28 rounded-md border border-input bg-white px-2 py-0.5 text-center text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="…"
            />
          )}
        </span>
      ))}
    </div>
  );
}
