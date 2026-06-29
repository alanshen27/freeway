"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CourseProgressCard } from "@/components/CourseProgressCard";

type C = {
  id: string;
  title: string;
  summary: string;
  progress: number;
  status: string;
  coverImageUrl?: string | null;
};

export function CoursesList({ courses }: { courses: C[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      courses.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())),
    [courses, q]
  );

  return (
    <div className="mt-6 space-y-5">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search courses…"
          className="h-9 pl-9"
        />
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
              status={c.status}
              coverImageUrl={c.coverImageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
