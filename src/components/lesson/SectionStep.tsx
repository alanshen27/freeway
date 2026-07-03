"use client";

import { useState } from "react";
import { SectionView } from "@/components/lesson/SectionView";
import { SectionFooter } from "@/components/lesson/SectionFooter";
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

export function SectionStep({
  section,
  videos,
  exercises,
  courseId,
  stepLabel,
  lessonId,
  nextHref,
  exitHref,
  completed,
}: {
  section: Section;
  videos: VideoRec[];
  exercises: ExerciseRec[];
  courseId: string;
  stepLabel?: string;
  lessonId: string;
  nextHref?: string;
  exitHref?: string;
  completed: boolean;
}) {
  const [worksheetReady, setWorksheetReady] = useState(section.type !== "WORKSHEET");
  const [questionsSubmitted, setQuestionsSubmitted] = useState(section.type !== "QUESTIONS");
  const canComplete = completed || worksheetReady || questionsSubmitted;

  return (
    <>
      <SectionView
        section={section}
        videos={videos}
        exercises={exercises}
        courseId={courseId}
        stepLabel={stepLabel}
        onWorksheetReadyChange={setWorksheetReady}
        onQuestionsSubmittedChange={setQuestionsSubmitted}
      />
      <SectionFooter
        sectionId={section.id}
        lessonId={lessonId}
        exitHref={exitHref}
        nextHref={nextHref}
        completed={completed}
        canComplete={canComplete}
        pendingHint={
          section.type === "WORKSHEET"
            ? "Answer every problem to continue"
            : section.type === "QUESTIONS"
              ? "Submit your answers to continue"
              : undefined
        }
        label={
          section.type === "WORKSHEET"
            ? "Submit & continue"
            : section.type === "QUESTIONS"
              ? "Continue"
              : "Mark complete & continue"
        }
      />
    </>
  );
}
