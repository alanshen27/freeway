"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, HelpCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CodingExercise } from "./CodingExercise";
import { CircuitExercise } from "./CircuitExercise";
import { VisualExercise } from "./VisualExercise";
import { McqExercise } from "./McqExercise";
import { GradedTextExercise } from "./GradedTextExercise";
import { OrderingExercise } from "./OrderingExercise";
import { FillBlankExercise } from "./FillBlankExercise";
import { MatchingExercise } from "./MatchingExercise";
import { NumericExercise } from "./NumericExercise";
import { FlashcardsExercise } from "./FlashcardsExercise";
import { CategorizeExercise } from "./CategorizeExercise";
import { CodeOutputExercise } from "./CodeOutputExercise";
import { LogicCircuitExercise } from "./LogicCircuitExercise";
import { GeometryExercise } from "./GeometryExercise";
import { FreeBodyExercise } from "./FreeBodyExercise";

export type ExerciseType =
  | "CODING"
  | "CIRCUIT"
  | "VISUAL"
  | "MCQ"
  | "GRADED_TEXT"
  | "ORDERING"
  | "FILL_BLANK"
  | "MATCHING"
  | "NUMERIC"
  | "FLASHCARDS"
  | "CATEGORIZE"
  | "CODE_OUTPUT"
  | "LOGIC_CIRCUIT"
  | "GEOMETRY"
  | "FREE_BODY";

export type ExercisePayload = {
  id: string;
  type: ExerciseType;
  title: string;
  prompt: string;
  config: Record<string, unknown>;
  courseId: string;
};

type Result = { status: string; score: number; feedback: string };

/** Strip markdown markers so LLM prompts render as plain readable text. */
function plainPrompt(text: string): string {
  return text
    .replace(/```[\w]*\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

export function ExerciseRunner({ exercise }: { exercise: ExercisePayload }) {
  const router = useRouter();
  const [answer, setAnswer] = useState<unknown>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/exercises/${exercise.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    const data = (await res.json()) as Result;
    setResult(data);
    setLoading(false);
    if (data.status === "PASSED") router.refresh();
  }

  const typeLabel: Record<string, string> = {
    CODING: "Coding",
    CIRCUIT: "Circuit",
    VISUAL: "Interactive",
    MCQ: "Quiz",
    GRADED_TEXT: "Written",
    ORDERING: "Ordering",
    FILL_BLANK: "Fill-in",
    MATCHING: "Matching",
    NUMERIC: "Calculation",
    FLASHCARDS: "Flashcards",
    CATEGORIZE: "Sorting",
    CODE_OUTPUT: "Trace the code",
    LOGIC_CIRCUIT: "Circuit builder",
    GEOMETRY: "Geometry",
    FREE_BODY: "Force diagram",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="primary">{typeLabel[exercise.type]}</Badge>
        <Link
          href={`/feed/${exercise.courseId}/new?exerciseId=${exercise.id}`}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <HelpCircle className="size-3.5" /> Ask for help
        </Link>
      </div>
      <h3 className="mt-3 text-base font-semibold">{exercise.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {plainPrompt(exercise.prompt)}
      </p>

      <div className="mt-5 border-t border-border pt-5">
        {exercise.type === "CODING" && (
          <CodingExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "CIRCUIT" && (
          <CircuitExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "VISUAL" && (
          <VisualExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "MCQ" && (
          <McqExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "GRADED_TEXT" && (
          <GradedTextExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "ORDERING" && (
          <OrderingExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "FILL_BLANK" && (
          <FillBlankExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "MATCHING" && (
          <MatchingExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "NUMERIC" && (
          <NumericExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "FLASHCARDS" && (
          <FlashcardsExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "CATEGORIZE" && (
          <CategorizeExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "CODE_OUTPUT" && (
          <CodeOutputExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "LOGIC_CIRCUIT" && (
          <LogicCircuitExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "GEOMETRY" && (
          <GeometryExercise config={exercise.config} onChange={setAnswer} />
        )}
        {exercise.type === "FREE_BODY" && (
          <FreeBodyExercise config={exercise.config} onChange={setAnswer} />
        )}
      </div>

      {result && (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
            result.status === "PASSED"
              ? "border-mint/30 bg-mint-soft text-mint"
              : "border-blush/30 bg-blush-soft text-blush"
          )}
        >
          {result.status === "PASSED" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="whitespace-pre-wrap">
            {result.feedback}
            {result.status === "PASSED" && (
              <span className="mt-1 flex items-center gap-1 text-xs font-medium">
                <Trophy className="size-3.5" /> +10 XP
              </span>
            )}
          </div>
        </div>
      )}

      <Button
        className="mt-4 w-full sm:w-auto"
        disabled={loading || answer == null}
        onClick={submit}
      >
        {loading ? "Checking…" : result?.status === "PASSED" ? "Completed" : "Submit answer"}
      </Button>
    </div>
  );
}
