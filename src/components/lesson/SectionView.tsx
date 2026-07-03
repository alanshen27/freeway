import { Markdown } from "@/components/Markdown";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ExerciseRunner } from "@/components/exercises/ExerciseRunner";
import { QuestionsSection } from "@/components/lesson/QuestionsSection";
import { SECTION_META, isSectionTypeKey } from "@/lib/section-types";
import type { ReadingSectionData, QuestionsSectionData, WorksheetSectionData } from "@/lib/schemas";
import { WorksheetSection } from "@/components/lesson/WorksheetSection";
import type { ExerciseType } from "@prisma/client";

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
  onWorksheetReadyChange,
  onQuestionsSubmittedChange,
}: {
  section: Section;
  videos: VideoRec[];
  exercises: ExerciseRec[];
  courseId: string;
  /** e.g. "Step 3 of 4" — rendered in the eyebrow next to the section type. */
  stepLabel?: string;
  onWorksheetReadyChange?: (ready: boolean) => void;
  onQuestionsSubmittedChange?: (submitted: boolean) => void;
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

      <div>
        {section.type === "READING" ? (
          <Markdown
            source={(section.data as ReadingSectionData).markdown}
            parentheticalMath
          />
        ) : null}

        {section.type === "WORKSHEET" ? (
          <WorksheetSection
            sectionId={section.id}
            data={section.data as WorksheetSectionData}
            onReadyChange={onWorksheetReadyChange}
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
          <QuestionsSection
            sectionId={section.id}
            data={section.data as QuestionsSectionData}
            onSubmittedChange={onQuestionsSubmittedChange}
          />
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
