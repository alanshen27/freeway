import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/layout/Page";
import { CoverImage } from "@/components/lesson/CoverImage";

type Props = {
  href: string;
  title: string;
  summary: string;
  progress?: number;
  status?: string;
  compact?: boolean;
  coverImageUrl?: string | null;
};

/** Course row for use inside a ListPanel — no nested card chrome. */
export function CourseCard({
  href,
  title,
  summary,
  progress = 0,
  status,
  compact,
  coverImageUrl,
}: Props) {
  return (
    <ListRow href={href} className="group">
      {coverImageUrl ? (
        <CoverImage
          src={coverImageUrl}
          alt=""
          className="size-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
          <BookOpen className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          {status === "GENERATING" && <Badge variant="warn">Generating</Badge>}
          {status === "DRAFT" && <Badge variant="outline">Draft</Badge>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {summary}
        </p>
        {!compact && status === "READY" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </ListRow>
  );
}

/** Standalone course link (outside ListPanel) — still flat, no shadow card. */
export function CourseLink({
  href,
  title,
  summary,
  coverImageUrl,
}: Pick<Props, "href" | "title" | "summary" | "coverImageUrl">) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3 transition-colors hover:bg-secondary/40"
    >
      {coverImageUrl ? (
        <CoverImage
          src={coverImageUrl}
          alt=""
          className="size-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
          <BookOpen className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium">{title}</h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">{summary}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
