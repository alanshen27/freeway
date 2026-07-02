"use client";
import { useMemo, useState } from "react";
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
  coverImageUrl?: string | null;
};

const FILTERS = ["All", "In progress", "Completed", "Not started"] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(c: C, f: Filter) {
  if (f === "All") return true;
  if (f === "In progress") return c.progress > 0 && c.progress < 100;
  if (f === "Completed") return c.lessonsTotal > 0 && c.progress === 100;
  return c.progress === 0;
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

  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q.toLowerCase()) &&
          matchesFilter(c, filter)
      ),
    [courses, q, filter]
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
          {filtered.map((c) => (
            <CourseProgressCard
              key={c.id}
              href={`/courses/${c.id}`}
              title={c.title}
              summary={c.summary}
              progress={c.progress}
              lessonsDone={c.lessonsDone}
              lessonsTotal={c.lessonsTotal}
              status={c.status}
              level={c.level}
              category={c.category}
              coverImageUrl={c.coverImageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
