"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  BookOpen,
  Clock,
  Check,
  Brain,
  Cog,
  Atom,
  FlaskConical,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CAREERS, prelimFor, type CareerOption } from "@/lib/catalog";
import { formatCategory } from "@/lib/course-labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Page, PageTitle } from "@/components/layout/Page";

const DURATIONS = [
  { weeks: 4, label: "1 month", blurb: "Fast track", detail: "A few hours most days" },
  { weeks: 8, label: "2 months", blurb: "Recommended", detail: "~1 hour per day" },
  { weeks: 26, label: "6 months", blurb: "Steady", detail: "A few sessions per week" },
  { weeks: 52, label: "1 year", blurb: "Marathon", detail: "Light weekly pace" },
] as const;

const CAREER_ICONS: Record<string, LucideIcon> = {
  "software-engineering": BookOpen,
  "ai-engineering": Brain,
  "mechanical-engineering": Cog,
  "nuclear-engineering": Atom,
  "introduction-to-physics": FlaskConical,
  "materials-science": Layers,
};

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Track", "Pace", "Tailor"];
  return (
    <div className="mb-6 flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "hidden h-px w-6 sm:block",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                  active && "bg-primary text-white",
                  done && "bg-brand-100 text-brand-700",
                  !active && !done && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : n}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CareerCard({
  career,
  onSelect,
}: {
  career: CareerOption;
  onSelect: () => void;
}) {
  const Icon = CAREER_ICONS[career.slug] ?? BookOpen;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div
        className="relative flex h-24 items-end p-4"
        style={{
          background: `linear-gradient(135deg, ${career.from} 0%, ${career.to} 100%)`,
        }}
      >
        <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/30">
          {formatCategory(career.category)}
        </span>
        <Icon
          className="absolute right-3 top-3 size-8 text-white/35 transition-transform group-hover:scale-110"
          strokeWidth={1.25}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-sm font-semibold leading-snug text-foreground">
          {career.title}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {career.blurb}
        </p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
          Choose track
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

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
      <Page wide>
        <StepDots step={2} />
        <PageTitle
          eyebrow="Create"
          title="How long do you want to spend?"
          description={`We'll pace ${career.title} — and assignment due dates — to fit your schedule`}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DURATIONS.map((d) => {
            const selected = durationWeeks === d.weeks;
            return (
              <button
                key={d.weeks}
                type="button"
                onClick={() => setDurationWeeks(d.weeks)}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-5 text-left transition-all",
                  selected
                    ? "border-primary bg-brand-50/50 shadow-sm ring-2 ring-primary/30"
                    : "border-border bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                {d.weeks === 8 && (
                  <span className="absolute right-3 top-3 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                    Popular
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      selected
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <Clock className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-lg font-semibold text-foreground">
                      {d.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-brand-600">
                      {d.blurb}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {d.detail}
                    </span>
                    <span className="mt-2 block text-[11px] text-muted-foreground/80">
                      {d.weeks} weeks · ~{Math.round(d.weeks * 5)} study days
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => setStep("questions")}>
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
        <StepDots step={3} />
        <PageTitle
          eyebrow="Create"
          title="Tailor your course"
          description={`A few details help us personalize ${career.title}`}
        />
        <div className="mt-6 space-y-5">
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <label className="text-sm font-medium leading-snug">{q}</label>
              <Textarea
                className="mt-3 min-h-24 border-slate-200 bg-slate-50/50 focus:bg-white"
                value={answers[i] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => {
                    const n = [...a];
                    n[i] = e.target.value;
                    return n;
                  })
                }
                placeholder="Optional — skip if you prefer a general path"
              />
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" disabled={submitting} onClick={generate}>
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
    <Page wide>
      <StepDots step={1} />
      <PageTitle
        eyebrow="Create"
        title={first ? "Choose your first path" : "New course"}
        description="Pick a career track — we'll build a hands-on program with lessons, exercises, and videos"
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAREERS.map((c) => (
          <CareerCard
            key={c.slug}
            career={c}
            onSelect={() => {
              setCareer(c);
              setAnswers([]);
              setStep("duration");
            }}
          />
        ))}
      </div>
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
