"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssignmentQuizData } from "@/lib/schemas";
import { InlineMarkdown } from "@/components/Markdown";

export function QuizPlayer({
  assignmentId,
  data,
}: {
  assignmentId: string;
  data: AssignmentQuizData;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    if (!data.result) return {};
    return Object.fromEntries(data.result.answers.map((a, i) => [i, a]));
  });
  const [result, setResult] = useState(data.result ?? null);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = data.items.every((_, i) => answers[i] !== undefined);

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/assignments/${assignmentId}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: data.items.map((_, i) => answers[i]),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const json = await res.json();
      setResult(json.result);
      router.refresh();
    }
  }

  function retake() {
    setAnswers({});
    setResult(null);
  }

  const submitted = result !== null;
  const pct = result ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <section>
      {submitted && (
        <div
          className={cn(
            "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
            pct >= 70
              ? "border-mint/30 bg-mint-soft/50"
              : "border-lemon/30 bg-lemon-soft/50"
          )}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              Score: {result.score}/{result.total} ({pct}%)
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pct >= 70
                ? "Nice work — review the explanations below."
                : "Worth a review — check the explanations, then retake."}
            </p>
          </div>
          <button
            type="button"
            onClick={retake}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RotateCcw className="size-3.5" />
            Retake
          </button>
        </div>
      )}

      <ol className="divide-y divide-border rounded-xl border border-border bg-white">
        {data.items.map((item, i) => {
          const picked = answers[i];
          const wrong =
            submitted && picked !== undefined && picked !== item.answerIndex;
          return (
            <li key={i} className="px-4 py-4">
              <div className="text-sm font-medium">
                {i + 1}. <InlineMarkdown source={item.question} parentheticalMath />
              </div>
              <div className="mt-2 space-y-1">
                {item.choices.map((c, ci) => (
                  <button
                    key={ci}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: ci }))}
                    className={cn(
                      "block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      picked === ci && !submitted && "border-primary bg-brand-50",
                      submitted && ci === item.answerIndex && "border-mint bg-mint-soft",
                      wrong && picked === ci && "border-blush bg-blush-soft"
                    )}
                  >
                    <InlineMarkdown source={c} parentheticalMath />
                  </button>
                ))}
              </div>
              {submitted && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <InlineMarkdown source={item.explanation} parentheticalMath />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <button
          type="button"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          disabled={!allAnswered || submitting}
          onClick={submit}
        >
          {submitting ? "Submitting…" : "Submit quiz"}
        </button>
      )}
    </section>
  );
}
