"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, X } from "lucide-react";
import type { AssignmentType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_META } from "@/lib/assignment-meta";

const TYPES: AssignmentType[] = ["PRACTICE", "PROJECT", "QUIZ"];
const DUE_OPTIONS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 60, label: "2 months" },
] as const;

export function NewAssignmentForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AssignmentType>("PRACTICE");
  const [topic, setTopic] = useState("");
  const [dueInDays, setDueInDays] = useState<number>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          topic: topic.trim() || undefined,
          dueInDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.assignment) {
        router.push(`/assignments/${data.assignment.id}`);
        router.refresh();
        return;
      }
      setError(data.error ?? "Something went wrong.");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Plus className="size-3.5" />
        New assignment
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          New assignment
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {TYPES.map((t) => {
          const meta = ASSIGNMENT_META[t];
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-brand-50/60 text-foreground ring-1 ring-primary"
                  : "border-border text-muted-foreground hover:border-slate-300"
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  meta.bg
                )}
              >
                <meta.Icon className={cn("size-4", meta.color)} />
              </span>
              {meta.label}
            </button>
          );
        })}
      </div>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Focus topic (optional) — e.g. a module or concept"
        className="mt-3 h-9 w-full rounded-lg border border-border px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring/40"
      />

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Due in</span>
        <div className="flex gap-1">
          {DUE_OPTIONS.map((d) => (
            <button
              key={d.days}
              type="button"
              onClick={() => setDueInDays(d.days)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                dueInDays === d.days
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={create}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        <Sparkles className="size-4" />
        {loading ? "Generating with AI…" : "Generate assignment"}
      </button>
      {loading && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          This usually takes a few seconds.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-blush">{error}</p>}
    </div>
  );
}
