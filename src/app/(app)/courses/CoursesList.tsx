"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CourseProgressCard } from "@/components/CourseProgressCard";

type C = {
  id: string;
  title: string;
  summary: string;
  progress: number;
  lessonsDone: number;
  lessonsTotal: number;
  status: string;
  level: string;
  category: string;
  isTaster?: boolean;
  coverImageUrl?: string | null;
};

type GenStatus = {
  progress: number;
  step: string;
  message: string;
};

const FILTERS = ["All", "In progress", "Completed", "Not started"] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(c: C, f: Filter) {
  if (f === "All") return true;
  if (f === "In progress")
    return c.status === "GENERATING" || (c.progress > 0 && c.progress < 100);
  if (f === "Completed") return c.lessonsTotal > 0 && c.progress === 100;
  return c.progress === 0 && c.status !== "GENERATING";
}

export function CoursesList({
  courses,
  initialQuery = "",
}: {
  courses: C[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("All");
  const [genStatus, setGenStatus] = useState<Record<string, GenStatus>>({});
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const hasGenerating = useMemo(
    () => courses.some((c) => c.status === "GENERATING"),
    [courses]
  );

  useEffect(() => {
    if (!hasGenerating) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch("/api/courses/generation-status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            courses: Record<string, GenStatus & { jobId: string; status: string }>;
          };
          if (!stop) {
            const next: Record<string, GenStatus> = {};
            for (const [id, s] of Object.entries(data.courses ?? {})) {
              next[id] = {
                progress: s.progress,
                step: s.step,
                message: s.message,
              };
            }
            setGenStatus(next);
          }
        }
      } catch {
        /* retry */
      }
      if (!stop) timer = setTimeout(poll, 2000);
    }

    poll();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [hasGenerating]);

  const visible = useMemo(
    () => courses.filter((c) => !removedIds.has(c.id)),
    [courses, removedIds]
  );

  const filtered = useMemo(
    () =>
      visible.filter(
        (c) =>
          c.title.toLowerCase().includes(q.toLowerCase()) &&
          matchesFilter(c, filter)
      ),
    [visible, q, filter]
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No courses match your search.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const live = genStatus[c.id];
            return (
              <CourseProgressCard
                key={c.id}
                href={`/courses/${c.id}`}
                courseId={c.id}
                onDelete={() =>
                  setRemovedIds((prev) => new Set(prev).add(c.id))
                }
                title={c.title}
                summary={c.summary}
                progress={c.progress}
                lessonsDone={c.lessonsDone}
                lessonsTotal={c.lessonsTotal}
                status={c.status}
                level={c.level}
                category={c.category}
                isTaster={c.isTaster}
                coverImageUrl={c.coverImageUrl}
                generationProgress={live?.progress}
                generationMessage={live?.message}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
