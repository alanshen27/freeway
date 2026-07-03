"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionsSectionData } from "@/lib/schemas";
import {
  isMcqQuestion,
  isOpenQuestion,
  questionMarks,
  sectionTotalMarks,
} from "@/lib/questions";
import { Button } from "@/components/ui/button";

type McqResult = { kind: "mcq"; correct: boolean; marks: number; maxMarks: number };
type OpenResult = {
  kind: "open";
  marks: number;
  maxMarks: number;
  feedback: string;
};
type ItemResult = McqResult | OpenResult;

export function QuestionsSection({
  sectionId,
  data,
  onSubmittedChange,
}: {
  sectionId: string;
  data: QuestionsSectionData;
  onSubmittedChange?: (submitted: boolean) => void;
}) {
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, ItemResult>>({});
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");

  const totalMarks = sectionTotalMarks(data.items);

  const allAnswered = data.items.every((item, i) =>
    isMcqQuestion(item)
      ? mcqAnswers[i] !== undefined
      : (openAnswers[i]?.trim().length ?? 0) > 0
  );

  async function submit() {
    if (!allAnswered || grading) return;
    setGrading(true);
    setError("");

    const next: Record<number, ItemResult> = {};
    const openPayload: { index: number; text: string }[] = [];

    data.items.forEach((item, i) => {
      if (isMcqQuestion(item)) {
        const correct = mcqAnswers[i] === item.answerIndex;
        const maxMarks = questionMarks(item);
        next[i] = {
          kind: "mcq",
          correct,
          marks: correct ? maxMarks : 0,
          maxMarks,
        };
      } else if (isOpenQuestion(item)) {
        openPayload.push({ index: i, text: openAnswers[i]?.trim() ?? "" });
      }
    });

    try {
      if (openPayload.length > 0) {
        const res = await fetch(`/api/sections/${sectionId}/grade-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: openPayload }),
        });
        const payload = (await res.json()) as {
          results?: { index: number; marks: number; maxMarks: number; feedback: string }[];
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error ?? "Grading failed");
        for (const row of payload.results ?? []) {
          next[row.index] = {
            kind: "open",
            marks: row.marks,
            maxMarks: row.maxMarks,
            feedback: row.feedback,
          };
        }
      }

      const earnedMarks = Object.values(next).reduce((sum, r) => sum + r.marks, 0);

      await fetch(`/api/sections/${sectionId}/quiz-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: earnedMarks, total: totalMarks }),
      });

      setResults(next);
      setSubmitted(true);
      onSubmittedChange?.(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGrading(false);
    }
  }

  const earnedMarks = Object.values(results).reduce((sum, r) => sum + r.marks, 0);

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Total: {totalMarks} marks
        {submitted ? ` · You scored ${earnedMarks}/${totalMarks}` : null}
      </p>

      <ol className="space-y-4">
        {data.items.map((item, i) => {
          const maxMarks = questionMarks(item);
          const result = results[i];
          const mcq = isMcqQuestion(item);
          const open = isOpenQuestion(item);

          return (
            <li
              key={i}
              className="rounded-xl border border-border bg-white p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {i + 1}. {item.question}
                </p>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {maxMarks} mark{maxMarks === 1 ? "" : "s"}
                </span>
              </div>

              {mcq ? (
                <div className="mt-3 space-y-1">
                  {item.choices.map((c, ci) => {
                    const picked = mcqAnswers[i];
                    const show = submitted && result?.kind === "mcq";
                    const correct = show && ci === item.answerIndex;
                    const wrong = show && picked === ci && ci !== item.answerIndex;
                    return (
                      <button
                        key={ci}
                        type="button"
                        disabled={submitted}
                        onClick={() => setMcqAnswers((a) => ({ ...a, [i]: ci }))}
                        className={cn(
                          "block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          picked === ci && !submitted && "border-primary bg-brand-50",
                          correct && "border-mint bg-mint-soft",
                          wrong && "border-blush bg-blush-soft"
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {open ? (
                <textarea
                  value={openAnswers[i] ?? ""}
                  onChange={(e) =>
                    setOpenAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  disabled={submitted}
                  rows={4}
                  placeholder="Write your answer…"
                  className="mt-3 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-ring/40 disabled:bg-secondary/30"
                />
              ) : null}

              {submitted && result ? (
                <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                  <p className="font-medium">
                    {result.marks}/{result.maxMarks} marks
                    {result.kind === "mcq" && !result.correct ? " · Incorrect" : null}
                  </p>
                  {result.kind === "mcq" ? (
                    <p className="mt-1 text-muted-foreground">{item.explanation}</p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">{result.feedback}</p>
                  )}
                  {open && item.modelAnswer ? (
                    <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Answer key: </span>
                      {item.modelAnswer}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <Button
          type="button"
          className="mt-4"
          disabled={!allAnswered || grading}
          onClick={submit}
        >
          {grading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Grading…
            </>
          ) : (
            "Submit for marking"
          )}
        </Button>
      ) : null}

      {error ? <p className="mt-3 text-sm text-blush">{error}</p> : null}
    </div>
  );
}
