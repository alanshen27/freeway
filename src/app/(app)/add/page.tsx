"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ChevronRight, BookOpen } from "lucide-react";
import { CAREERS, prelimFor } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Page, PageTitle, ListPanel } from "@/components/layout/Page";

function AddFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const first = params.get("first");
  const [step, setStep] = useState<"pick" | "questions">("pick");
  const [career, setCareer] = useState<(typeof CAREERS)[number] | null>(null);
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
          responses: questions.map((q, i) => ({
            prompt: q,
            answer: answers[i] ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        router.push(`/add/generating/${data.jobId}`);
        return;
      }
      setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  if (step === "questions" && career) {
    return (
      <Page>
        <PageTitle
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
          <Button variant="ghost" onClick={() => setStep("pick")}>
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
              setStep("questions");
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
