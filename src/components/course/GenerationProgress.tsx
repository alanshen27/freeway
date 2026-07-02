"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type Log = { step: string; msg: string };
type Job = {
  status: string;
  progress: number;
  step: string;
  logs: Log[];
  courseId: string | null;
  error?: string | null;
};

const STEPS = [
  { key: "orchestrating", label: "Analyzing your profile" },
  { key: "structuring", label: "Structuring curriculum" },
  { key: "content", label: "Generating lessons and exercises" },
  { key: "assignments", label: "Creating starter assignments" },
  { key: "done", label: "Finalizing course" },
];

/**
 * Live generation panel shown on the course page while a job runs.
 * Polls the job, then refreshes the page when the course is ready.
 */
export function GenerationProgress({
  jobId,
  courseId,
}: {
  jobId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Job;
          if (stop) return;
          setJob(data);
          if (data.status === "COMPLETED") {
            timer = setTimeout(() => router.refresh(), 900);
            return;
          }
          if (data.status === "FAILED") {
            router.refresh();
            return;
          }
        }
      } catch {
        /* retry on next tick */
      }
      if (!stop) timer = setTimeout(poll, 1200);
    }

    poll();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, router]);

  const progress = job?.progress ?? 0;
  const currentStepIndex = STEPS.findIndex((s) => s.key === job?.step);
  const logs = job?.logs ?? [];
  const failed = job?.status === "FAILED";
  const done = job?.status === "COMPLETED";
  const statusLine =
    logs[logs.length - 1]?.msg ??
    (job ? "Generating…" : "Connecting to generation status…");

  async function retry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to restart generation");
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setRetrying(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        {!failed && !done && (
          <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
        )}
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {failed
              ? "Generation failed"
              : done
                ? "Course ready"
                : "Generating your course"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {failed
              ? "Review the error below and try again."
              : statusLine}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="mt-2" />
      </div>

      <ol className="mt-6 divide-y divide-border rounded-lg border border-border">
        {STEPS.map((s, i) => {
          const stepDone = (currentStepIndex > i && currentStepIndex !== -1) || done;
          const active = currentStepIndex === i && !done && !failed;
          return (
            <li key={s.key} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  stepDone
                    ? "bg-primary text-white"
                    : active
                      ? "border border-primary text-primary"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {stepDone ? (
                  <Check className="size-3.5" />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-sm ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {failed && (
        <>
          <p className="mt-4 rounded-lg border border-blush/30 bg-blush-soft px-3 py-2 text-sm text-blush">
            {job?.error ?? "An unknown error occurred."}
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={retrying}
            onClick={retry}
          >
            <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Restarting…" : "Continue generation"}
          </Button>
        </>
      )}
    </section>
  );
}
