"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { QuestionsSectionData } from "@/lib/schemas";

export function QuestionsSection({
  data,
}: {
  data: QuestionsSectionData;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = data.items.filter(
    (item, i) => answers[i] === item.answerIndex
  ).length;

  return (
    <div>
      <ol className="divide-y divide-border rounded-lg border border-border">
        {data.items.map((item, i) => {
          const picked = answers[i];
          const correct = submitted && picked === item.answerIndex;
          const wrong = submitted && picked !== undefined && picked !== item.answerIndex;
          return (
            <li key={i} className="px-4 py-4">
              <p className="text-sm font-medium">
                {i + 1}. {item.question}
              </p>
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
                    {c}
                  </button>
                ))}
              </div>
              {submitted && (
                <p className="mt-2 text-xs text-muted-foreground">{item.explanation}</p>
              )}
            </li>
          );
        })}
      </ol>
      {!submitted ? (
        <button
          type="button"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          disabled={Object.keys(answers).length < data.items.length}
          onClick={() => setSubmitted(true)}
        >
          Check answers
        </button>
      ) : (
        <p className="mt-4 text-sm font-medium">
          Score: {score}/{data.items.length}
        </p>
      )}
    </div>
  );
}
