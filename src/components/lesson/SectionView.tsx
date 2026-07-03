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
  stepLabel,
}: {
  section: Section;
  videos: VideoRec[];
  exercises: ExerciseRec[];
  courseId: string;
  /** e.g. "Step 3 of 4" — rendered in the eyebrow next to the section type. */
  stepLabel?: string;
}) {
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const meta = isSectionTypeKey(section.type) ? SECTION_META[section.type] : null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {section.title ?? meta?.label ?? section.type}
        </h1>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {meta?.label ?? section.type}
          {stepLabel ? ` · ${stepLabel}` : ""}
        </p>
      </header>

      <div className={cn(section.type === "VIDEO" ? "max-w-none" : "max-w-none lg:max-w-3xl")}>
        {section.type === "READING" || section.type === "WORKSHEET" ? (
          <Markdown
            source={(section.data as ReadingSectionData).markdown}
            parentheticalMath
          />
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
