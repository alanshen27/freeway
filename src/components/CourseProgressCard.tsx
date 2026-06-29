import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  href: string;
  title: string;
  summary: string;
  progress?: number;
  status?: string;
  coverImageUrl?: string | null;
};

/** Dashboard-style course card with progress. */
export function CourseProgressCard({
  href,
  title,
  summary,
  progress = 0,
  status,
  coverImageUrl,
}: Props) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden bg-slate-100">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-300">
            <BookOpen className="size-10" strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {title}
          </h3>
          {status === "GENERATING" && <Badge variant="warn">Generating</Badge>}
          {status === "FAILED" && <Badge variant="outline">Failed</Badge>}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{summary}</p>

        {status === "READY" && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
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

      <div className="flex items-center justify-between border-t border-border bg-slate-50/80 px-4 py-2.5 text-xs text-muted-foreground">
        <span>View details</span>
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
