"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ChevronRight, BookOpen, Clock } from "lucide-react";
import { CAREERS, prelimFor } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Page, PageTitle, ListPanel } from "@/components/layout/Page";

const DURATIONS = [
  { weeks: 4, label: "1 month", blurb: "Fast and focused — a few hours most days" },
  { weeks: 8, label: "2 months", blurb: "Steady pace — about an hour a day" },
  { weeks: 26, label: "6 months", blurb: "Relaxed — a few sessions per week" },
  { weeks: 52, label: "1 year", blurb: "Long game — light weekly commitment" },
] as const;

function AddFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const first = params.get("first");
  const [step, setStep] = useState<"pick" | "duration" | "questions">("pick");
  const [career, setCareer] = useState<(typeof CAREERS)[number] | null>(null);
  const [durationWeeks, setDurationWeeks] = useState<number>(8);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = career ? prelimFor(career.category) : [];

  async function generate() {
    if (!career) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerSlug: career.slug,
          durationWeeks,
          responses: questions.map((q, i) => ({
            prompt: q,
            answer: answers[i] ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.courseId) {
        router.push(`/courses/${data.courseId}`);
        return;
      }
      setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  if (step === "duration" && career) {
    return (
      <Page>
        <PageTitle
          eyebrow="Create"
          title="How long do you want to spend?"
          description={`We'll pace ${career.title} — and its assignment due dates — to fit`}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DURATIONS.map((d) => (
            <button
              key={d.weeks}
              type="button"
              onClick={() => setDurationWeeks(d.weeks)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                durationWeeks === d.weeks
                  ? "border-primary bg-brand-50/60 ring-1 ring-primary"
                  : "border-border bg-white hover:border-slate-300"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  durationWeeks === d.weeks
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                <Clock className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {d.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {d.blurb}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setStep("questions")}>
            Continue
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => setStep("pick")}>
            Back
          </Button>
        </div>
      </Page>
    );
  }

  if (step === "questions" && career) {
    return (
      <Page>
        <PageTitle
          eyebrow="Create"
          title="Preliminary questions"
          description={`Help us tailor ${career.title} to your background`}
        />
        <div className="mt-6 space-y-5">
          {questions.map((q, i) => (
            <div key={i}>
              <label className="text-sm font-medium">{q}</label>
              <Textarea
                className="mt-2 min-h-20"
                value={answers[i] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => {
                    const n = [...a];
                    n[i] = e.target.value;
                    return n;
                  })
                }
                placeholder="Your answer…"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button disabled={submitting} onClick={generate}>
            <Sparkles className="size-4" />
            {submitting ? "Generating…" : "Generate course"}
          </Button>
          <Button variant="ghost" onClick={() => setStep("duration")}>
            Back
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </Page>
    );
  }

  return (
    <Page>
      <PageTitle
        eyebrow="Create"
        title={first ? "Choose your first path" : "New course"}
        description="Select a career track to generate a personalized program"
      />
      <ListPanel className="mt-6">
        {CAREERS.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => {
              setCareer(c);
              setAnswers([]);
              setStep("duration");
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium">{c.title}</h3>
              <p className="line-clamp-1 text-sm text-muted-foreground">{c.blurb}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </ListPanel>
    </Page>
  );
}

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddFlow />
    </Suspense>
  );
}
