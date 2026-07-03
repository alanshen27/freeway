"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 800;

export function AssignmentWorkPad({
  assignmentId,
  initialWork,
  markscheme,
}: {
  assignmentId: string;
  initialWork: string;
  /** When set, a show/hide markscheme control is rendered (practice assignments). */
  markscheme?: string | null;
}) {
  const [work, setWork] = useState(initialWork);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showMarkscheme, setShowMarkscheme] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(work);
  latest.current = work;

  useEffect(() => {
    if (work === initialWork) return;

    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}/work`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work: latest.current }),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [work, assignmentId, initialWork]);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : null;

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Your work</h2>
        {saveLabel && (
          <span
            className={cn(
              "text-xs",
              saveState === "error" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {saveLabel}
          </span>
        )}
      </div>
      <Textarea
        value={work}
        onChange={(e) => setWork(e.target.value)}
        placeholder="Write your answers, notes, and draft work here…"
        className="min-h-48 font-mono text-[0.8125rem] leading-relaxed"
      />

      {markscheme?.trim() ? (
        <div className="mt-6">
          <Button
            type="button"
            variant="duoOutline"
            size="sm"
            onClick={() => setShowMarkscheme((v) => !v)}
            aria-expanded={showMarkscheme}
          >
            {showMarkscheme ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            {showMarkscheme ? "Hide markscheme" : "Show markscheme"}
          </Button>
          {showMarkscheme && (
            <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Markscheme
              </h3>
              <Markdown source={markscheme} />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
