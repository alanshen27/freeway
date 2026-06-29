import { Markdown } from "@/components/Markdown";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ExerciseRunner } from "@/components/exercises/ExerciseRunner";
import { QuestionsSection } from "@/components/lesson/QuestionsSection";
import { SECTION_META, isSectionTypeKey } from "@/lib/section-types";
import type { ReadingSectionData, QuestionsSectionData } from "@/lib/schemas";
import type { ExerciseType } from "@prisma/client";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  type: string;
  title: string | null;
  order: number;
  data: unknown;
};

type VideoRec = {
  id: string;
  title: string;
  narration: string | null;
  url: string | null;
  audioUrl: string | null;
  durationSec: number;
  questions: unknown;
};

type ExerciseRec = {
  id: string;
  type: ExerciseType;
  title: string;
  prompt: string;
  config: unknown;
};

export function SectionView({
  section,
  videos,
  exercises,
  courseId,
}: {
  section: Section;
  videos: VideoRec[];
  exercises: ExerciseRec[];
  courseId: string;
}) {
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const meta = isSectionTypeKey(section.type) ? SECTION_META[section.type] : null;
  const { Icon } = meta ?? {
    Icon: () => null,
    label: section.type,
    bg: "bg-secondary",
    color: "text-muted-foreground",
  };

  return (
    <div>
      <header className="mb-5 flex items-start gap-3">
        {meta && (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              meta.bg
            )}
          >
            <Icon className={cn("size-5", meta.color)} aria-hidden />
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {meta?.label ?? section.type}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            {section.title ?? meta?.label ?? section.type}
          </h2>
        </div>
      </header>

      <div className={cn(section.type === "VIDEO" ? "max-w-none" : "max-w-none lg:max-w-3xl")}>
        {section.type === "READING" || section.type === "WORKSHEET" ? (
          <Markdown source={(section.data as ReadingSectionData).markdown} />
        ) : null}

        {section.type === "VIDEO" ? (
          (() => {
            const { videoId } = section.data as { videoId: string };
            const v = videoById.get(videoId);
            if (!v) return null;
            return (
              <VideoPlayer
                title={v.title}
                narration={v.narration}
                url={v.url}
                audioUrl={v.audioUrl}
                durationSec={v.durationSec}
                questions={(v.questions as never) ?? []}
              />
            );
          })()
        ) : null}

        {section.type === "QUESTIONS" ? (
          <QuestionsSection data={section.data as QuestionsSectionData} />
        ) : null}

        {section.type === "EXERCISE" ? (
          (() => {
            const { exerciseId } = section.data as { exerciseId: string };
            const e = exerciseById.get(exerciseId);
            if (!e) return null;
            return (
              <ExerciseRunner
                exercise={{
                  id: e.id,
                  type: e.type as never,
                  title: e.title,
                  prompt: e.prompt,
                  config: e.config as Record<string, unknown>,
                  courseId,
                }}
              />
            );
          })()
        ) : null}
      </div>
    </div>
  );
}
