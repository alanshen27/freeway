"use client";

import { useEffect, useMemo, useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { WorksheetSectionData } from "@/lib/schemas";
import { resolveWorksheetContent } from "@/lib/worksheet";

export function WorksheetSection({
  sectionId,
  data,
  onReadyChange,
}: {
  sectionId: string;
  data: WorksheetSectionData;
  onReadyChange?: (ready: boolean) => void;
}) {
  const { intro, items } = useMemo(() => resolveWorksheetContent(data), [data]);
  const storageKey = `worksheet:${sectionId}`;

  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<number, string>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* ignore quota */
    }
  }, [answers, storageKey]);

  useEffect(() => {
    if (!onReadyChange) return;
    if (items.length === 0) {
      onReadyChange(true);
      return;
    }
    const ready = items.every((_, i) => (answers[i]?.trim().length ?? 0) > 0);
    onReadyChange(ready);
  }, [answers, items, onReadyChange]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This worksheet has no practice items yet. You can still mark it complete to
        continue.
        {intro ? (
          <div className="mt-4">
            <Markdown source={intro} parentheticalMath />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {intro ? (
        <div className="mb-6">
          <Markdown source={intro} parentheticalMath />
        </div>
      ) : null}

      <ol className="space-y-6">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-white p-4 shadow-card"
          >
            <label htmlFor={`ws-${sectionId}-${i}`} className="block text-sm font-medium">
              {i + 1}. {item.prompt}
            </label>
            {item.hint ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            ) : null}
            <textarea
              id={`ws-${sectionId}-${i}`}
              value={answers[i] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
              }
              rows={4}
              placeholder="Write your answer here…"
              className="mt-3 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
