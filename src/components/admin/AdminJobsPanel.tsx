"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type JobRow = {
  id: string;
  courseId: string | null;
  courseTitle: string | null;
  courseStatus: string | null;
  userName: string;
  userEmail: string | null;
  type: string;
  status: string;
  progress: number;
  step: string;
  error: string | null;
  createdAt: string;
  durationSec: number | null;
  durationLabel: string | null;
  llmCostUsd: number | null;
  llmCalls: number | null;
  llmInputTokens: number | null;
  llmOutputTokens: number | null;
};

type Stats = {
  total: number;
  queued: number;
  running: number;
  failed: number;
  completed: number;
  orphaned: number;
  completedCostUsd: number;
  avgCompletedCostUsd: number | null;
};

function formatUsd(n: number | null): string {
  if (n == null) return "—";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function statusVariant(status: string) {
  switch (status) {
    case "RUNNING":
      return "warn" as const;
    case "FAILED":
      return "danger" as const;
    case "COMPLETED":
      return "good" as const;
    default:
      return "default" as const;
  }
}

export function AdminJobsPanel() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "failed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setStats(data.stats ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteJob(jobId: string) {
    if (!confirm("Delete this generation job from the DB and BullMQ queue?")) return;
    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        router.refresh();
        await load();
      }
    } finally {
      setDeletingId(null);
    }
  }

  const visible = jobs.filter((j) => {
    if (filter === "active")
      return j.status === "QUEUED" || j.status === "RUNNING";
    if (filter === "failed") return j.status === "FAILED";
    return true;
  });

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {(
            [
              ["Total", String(stats.total)],
              ["Queued", String(stats.queued)],
              ["Running", String(stats.running)],
              ["Failed", String(stats.failed)],
              ["Done", String(stats.completed)],
              ["Orphan", String(stats.orphaned)],
              ["Completed spend", formatUsd(stats.completedCostUsd)],
              [
                "Avg / course",
                stats.avgCompletedCostUsd != null
                  ? formatUsd(stats.avgCompletedCostUsd)
                  : "—",
              ],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-white px-4 py-3"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["failed", "Failed"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="border border-border">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-slate-50/80 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {loading ? "Loading…" : "No jobs match this filter."}
                </td>
              </tr>
            ) : (
              visible.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{j.id.slice(0, 12)}…</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(j.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {j.courseTitle ? (
                      <>
                        <p className="line-clamp-1 font-medium">{j.courseTitle}</p>
                        {j.courseStatus && (
                          <p className="text-xs text-muted-foreground">{j.courseStatus}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No course</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p>{j.userName}</p>
                    <p className="text-xs text-muted-foreground">{j.userEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(j.status)}>{j.status}</Badge>
                    {j.error && (
                      <p className="mt-1 line-clamp-2 text-xs text-destructive">{j.error}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{j.progress}%</p>
                    <p className="text-xs text-muted-foreground">{j.step}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === j.id}
                      onClick={() => deleteJob(j.id)}
                      className="text-destructive hover:bg-blush-soft hover:text-blush"
                    >
                      {deletingId === j.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Deleting a course removes its generation jobs from Postgres automatically (cascade).
        Use this panel to remove stuck BullMQ jobs or clean up rows manually. Active workers may
        still run until the next checkpoint if a queue job was not removed in time.
      </p>
    </div>
  );
}
