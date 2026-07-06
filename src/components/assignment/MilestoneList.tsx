"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dueInfo } from "@/lib/assignment-meta";
import { InlineMarkdown } from "@/components/Markdown";

type Milestone = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  completedAt: string | null;
};

export function MilestoneList({
  assignmentId,
  milestones,
}: {
  assignmentId: string;
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(milestones);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(m: Milestone) {
    const completed = !m.completedAt;
    setBusy(m.id);
    // Optimistic update.
    setItems((list) =>
      list.map((x) =>
        x.id === m.id
          ? { ...x, completedAt: completed ? new Date().toISOString() : null }
          : x
      )
    );
    const res = await fetch(
      `/api/assignments/${assignmentId}/milestones/${m.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      }
    );
    setBusy(null);
    if (!res.ok) {
      setItems((list) =>
        list.map((x) => (x.id === m.id ? { ...x, completedAt: m.completedAt } : x))
      );
      return;
    }
    router.refresh();
  }

  const done = items.filter((m) => m.completedAt).length;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Milestones</h2>
        <span className="text-xs text-muted-foreground">
          {done}/{items.length} complete
        </span>
      </div>
      <ol className="mt-3 space-y-2">
        {items.map((m, i) => {
          const due = dueInfo(m.dueAt, !!m.completedAt);
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={busy === m.id}
                onClick={() => toggle(m)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  m.completedAt
                    ? "border-mint/30 bg-mint-soft/40"
                    : "border-border bg-white hover:border-slate-300"
                )}
              >
                {m.completedAt ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-mint" />
                ) : (
                  <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      m.completedAt
                        ? "text-muted-foreground line-through decoration-mint/50"
                        : "text-foreground"
                    )}
                  >
                    {i + 1}. {m.title}
                  </span>
                  {m.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      <InlineMarkdown source={m.description} />
                    </span>
                  )}
                </span>
                {due && (
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap text-xs",
                      due.overdue ? "font-medium text-blush" : "text-muted-foreground"
                    )}
                  >
                    {due.label}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
