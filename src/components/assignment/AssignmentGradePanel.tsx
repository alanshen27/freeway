"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { InlineMarkdown, Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AssignmentGrade } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function AssignmentGradePanel({
  assignmentId,
  initialGrade,
}: {
  assignmentId: string;
  initialGrade?: AssignmentGrade | null;
}) {
  const [grade, setGrade] = useState<AssignmentGrade | null>(initialGrade ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runGrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/grade`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Grading failed");
        return;
      }
      if (json.grade) setGrade(json.grade as AssignmentGrade);
    } catch {
      setError("Grading failed");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor =
    grade && grade.overallScore >= 70
      ? "text-mint"
      : grade && grade.overallScore >= 50
        ? "text-amber-600"
        : "text-blush";

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Criteria feedback</h2>
        <Button
          type="button"
          variant="duoOutline"
          size="sm"
          disabled={loading}
          onClick={runGrade}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ClipboardCheck className="size-4" />
          )}
          {loading ? "Grading…" : grade ? "Re-grade" : "Grade"}
        </Button>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {!grade && !loading && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Save your work, then click <strong className="font-medium text-foreground">Grade</strong>{" "}
          to get feedback on how well it meets each milestone.
        </div>
      )}

      {grade && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Overall
            </span>
            <span className={cn("text-2xl font-semibold tabular-nums", scoreColor)}>
              {grade.overallScore}%
            </span>
            <Badge variant={grade.overallScore >= 60 ? "good" : "outline"}>
              {grade.overallScore >= 80 ? "Excellent" : (grade.overallScore >= 60 ? "Good" : "Needs work")}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(grade.gradedAt).toLocaleString()}
            </span>
          </div>

          <div className="mt-4 text-sm text-foreground">
            <Markdown source={grade.summary} />
          </div>

          {grade.milestones.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                By milestone
              </h3>
              <ul className="space-y-3">
                {grade.milestones.map((m) => (
                  <li
                    key={m.milestone}
                    className="rounded-lg border border-border bg-secondary/20 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{m.milestone}</span>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          m.score >= 80 ? "text-mint" : (m.score >= 60 ? "text-amber-600" : "text-blush")
                        )}
                      >
                        {m.score}%
                      </span>
                      <Badge variant={m.met ? "good" : "outline"} className="text-[10px]">
                        {m.met ? "Met" : "Not met"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 text-sm text-muted-foreground">
                      <InlineMarkdown source={m.feedback} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(grade.strengths.length > 0 || grade.improvements.length > 0) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {grade.strengths.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Strengths
                  </h3>
                  <ul className="space-y-1 text-sm text-foreground">
                    {grade.strengths.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-mint">+</span>
                        <span>
                          <InlineMarkdown source={s} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {grade.improvements.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    To improve
                  </h3>
                  <ul className="space-y-1 text-sm text-foreground">
                    {grade.improvements.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-amber-600">→</span>
                        <span>
                          <InlineMarkdown source={s} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
