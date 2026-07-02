import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteCourseButton } from "@/components/course/DeleteCourseButton";
import { formatCategory, formatLevel } from "@/lib/course-labels";

type Props = {
  href: string;
  courseId?: string;
  onDelete?: () => void;
  title: string;
  summary: string;
  progress?: number;
  lessonsDone?: number;
  lessonsTotal?: number;
  status?: string;
  level?: string;
  category?: string;
  isTaster?: boolean;
  coverImageUrl?: string | null;
  /** Live generation job progress (polled on courses list). */
  generationProgress?: number;
  generationMessage?: string;
};

/** LMS-style course card: cover, badges, progress, footer CTA. */
export function CourseProgressCard({
  href,
  courseId,
  onDelete,
  title,
  summary,
  progress = 0,
  lessonsDone,
  lessonsTotal,
  status,
  level,
  category,
  isTaster,
  coverImageUrl,
  generationProgress,
  generationMessage,
}: Props) {
  const complete = status === "READY" && (lessonsTotal ?? 0) > 0 && progress === 100;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-md">
      {courseId && (
        <div
          className="absolute right-2 top-2 z-10 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DeleteCourseButton
            courseId={courseId}
            redirectTo={null}
            onDeleted={onDelete}
            className="rounded-lg bg-white/95 shadow-sm ring-1 ring-black/5 hover:bg-white"
          />
        </div>
      )}
      <Link href={href} className="flex min-h-0 flex-1 flex-col">
      <div className="relative h-32 overflow-hidden bg-course-gradient">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/60">
            <BookOpen className="size-10" strokeWidth={1.25} />
          </div>
        )}
        {level && (
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
            {formatLevel(level)}
          </span>
        )}
        {complete && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-mint px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            <CheckCircle2 className="size-3" />
            Completed
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {category && (
          <p className="text-xs font-medium text-brand-600">
            {formatCategory(category)}
          </p>
        )}
        <div className="mt-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {title}
          </h3>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {isTaster && <Badge variant="outline">Taster</Badge>}
            {status === "GENERATING" && <Badge variant="warn">Generating</Badge>}
            {status === "FAILED" && <Badge variant="danger">Failed</Badge>}
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {summary}
        </p>

        {status === "GENERATING" && (
          <div className="mt-auto space-y-2 pt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span className="line-clamp-1 pr-2">
                {generationMessage ?? "Generating course…"}
              </span>
              <span className="shrink-0 font-medium text-foreground">
                {generationProgress ?? 0}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${generationProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {status === "READY" && (
          <div className="mt-auto pt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>
                {lessonsTotal != null && lessonsTotal > 0
                  ? `${lessonsDone ?? 0}/${lessonsTotal} steps`
                  : "Progress"}
              </span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-slate-50/80 px-4 py-2.5 text-xs font-medium">
        <span className="text-muted-foreground">
          {status !== "READY"
            ? "View details"
            : progress === 0
              ? "Start course"
              : complete
                ? "Review course"
                : "Continue learning"}
        </span>
        <span className="text-primary transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      </Link>
    </div>
  );
}
