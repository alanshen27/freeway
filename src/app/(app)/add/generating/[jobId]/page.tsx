"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/layout/Page";

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
  { key: "done", label: "Finalizing course" },
];

export default function GeneratingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let stop = false;
    async function poll() {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Job;
      if (stop) return;
      setJob(data);
      if (data.status === "COMPLETED" && data.courseId) {
        setTimeout(() => router.push(`/courses/${data.courseId}`), 900);
        return;
      }
      if (data.status === "FAILED") return;
      setTimeout(poll, 1200);
    }
    poll();
    return () => {
      stop = true;
    };
  }, [jobId, router]);

  const progress = job?.progress ?? 5;
  const currentStepIndex = STEPS.findIndex((s) => s.key === job?.step);
  const logs = job?.logs ?? [];
  const failed = job?.status === "FAILED";
  const done = job?.status === "COMPLETED";

  async function retry() {
    if (!job?.courseId) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/courses/${job.courseId}/generate`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to restart generation");
      if (data.jobId) router.push(`/add/generating/${data.jobId}`);
      else router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setRetrying(false);
    }
  }

  return (
    <Page className="max-w-lg">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold">
          {failed
            ? "Generation failed"
            : done
              ? "Course ready"
              : "Generating your course"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {failed
            ? "Review the error below and try again."
            : "This usually takes a few minutes. You can leave this page open."}
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="mt-2" />
      </div>

      <ol className="mt-8 space-y-0 divide-y divide-border rounded-lg border border-border bg-white">
        {STEPS.map((s, i) => {
          const stepDone = currentStepIndex > i || done;
          const active = currentStepIndex === i && !done && !failed;
          return (
            <li key={s.key} className="flex items-center gap-3 px-4 py-3">
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

      {logs.length > 0 && !failed && (
        <p className="mt-4 text-sm text-muted-foreground">
          {logs[logs.length - 1]?.msg}
        </p>
      )}
      {failed && (
        <>
          <p className="mt-4 rounded-lg border border-blush/30 bg-blush-soft px-3 py-2 text-sm text-blush">
            {job?.error ?? "An unknown error occurred."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {job?.courseId && (
              <Button type="button" disabled={retrying} onClick={retry}>
                <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
                {retrying ? "Restarting…" : "Try again"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={retrying}
              onClick={() => router.push("/courses")}
            >
              Back to courses
            </Button>
          </div>
        </>
      )}
    </Page>
  );
}
