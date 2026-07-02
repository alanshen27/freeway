import { llmJSON } from "@/lib/llm";
import { videoPlanSchema, type VideoPlan, type VideoSpec } from "@/lib/schemas";
import { getManimRenderEnvironment, manimLlmPreamble } from "@/workers/render/manim-env";
import {
  compileBeatsToManim,
  estimateDurationFromBeats,
} from "@/workers/render/manim-compile";

/**
 * Subagent: plans a beat-by-beat explainer, then compiles to Manim Python.
 * The LLM never writes raw manimScene — one beat = one self.play (reliable).
 */
export async function writeVideo(args: {
  courseTitle: string;
  lessonTitle: string;
  concepts: string[];
}): Promise<VideoSpec> {
  const concepts = args.concepts.slice(0, 3).join(", ");
  const renderEnv = await getManimRenderEnvironment();

  const plan = await llmJSON({
    task: "planVideoBeats",
    schema: videoPlanSchema,
    system:
      "You plan Manim explainer videos as an ordered list of BEATS. Each beat is " +
      "exactly ONE on-screen action — never combine steps. Output strict JSON only.",
    prompt: `${manimLlmPreamble(renderEnv)}

Course: ${args.courseTitle}
Lesson: ${args.lessonTitle}
Concepts: ${concepts}

Return JSON: { title, narration, durationSec, beats, questions }

BEAT PLANNING (critical):
- Provide 14–20 beats in playback order
- Each beat = ONE visual step (compiler emits one self.play or self.wait)
- NEVER plan two animations in one beat — e.g. separate "place_dot" then "move_dot", not both at once
- Do NOT use AnimationGroup, LaggedStart, or parallel ideas in beats
- Typical arc: title → shift_title_up → 2–4 text beats → fade_out → axes → plot_line → place_dot → move_dot → text → indicate → wait → text → circumscribe → wait
- Use "wait" beats (1–3s) between major ideas so the clip breathes
- narration: 8–12 sentences, ~150–250 words, paced for 90–150 seconds of voiceover
- durationSec: 90–150 (must match beat pacing)
- questions: 2 MCQs with atSec spread across the clip (e.g. 40 and 100)

Beat types (pick from these only):
- title { text } — opening title card
- shift_title_up — move title to top edge
- text { text } — one caption line (short)
- wait { seconds }
- fade_out — clear screen before next section
- axes — show coordinate axes
- plot_line { slope? } — draw one line on axes (slope -1 to 1)
- place_dot — show dot at start of line (requires axes + plot_line before move_dot)
- move_dot — animate dot along the line (own beat, after place_dot)
- indicate / circumscribe / flash — emphasize previous mobject`,
    mock: () => mockPlan(args.lessonTitle, args.concepts),
  });

  const className = safeSceneClassName(args.lessonTitle);
  const manimScene = compileBeatsToManim(className, plan.beats);
  const durationSec = Math.max(
    plan.durationSec,
    estimateDurationFromBeats(plan.beats)
  );

  return {
    title: plan.title,
    narration: plan.narration,
    manimScene,
    durationSec,
    questions: plan.questions.map((q) => ({
      ...q,
      atSec: Math.min(q.atSec, durationSec - 5),
    })),
  };
}

function safeSceneClassName(lessonTitle: string): string {
  const base = lessonTitle.replace(/[^a-zA-Z0-9]/g, "") || "Lesson";
  return `${base}Scene`;
}

function safeLabel(text: string, max = 40): string {
  return text.replace(/["\\]/g, "").slice(0, max);
}

function mockPlan(lessonTitle: string, concepts: string[]): VideoPlan {
  const label = safeLabel(lessonTitle);
  const concept = safeLabel(concepts[0] ?? "the core idea");
  return {
    title: lessonTitle,
    narration: `In this lesson we explore ${lessonTitle}. First we name the big picture, then we connect it to ${concept}. Watch how each piece appears one step at a time on the axes. The moving dot traces the relationship we care about. Pause on each caption and let the idea land before the next beat. By the end you should see why ${concept} matters and how the pieces fit together in practice.`,
    durationSec: 120,
    beats: [
      { type: "title", text: label },
      { type: "shift_title_up" },
      { type: "text", text: `Today: ${concept}` },
      { type: "wait", seconds: 2 },
      { type: "text", text: "One idea per step" },
      { type: "wait", seconds: 1.5 },
      { type: "fade_out" },
      { type: "axes" },
      { type: "plot_line", slope: 0.35 },
      { type: "place_dot" },
      { type: "move_dot", runTime: 4 },
      { type: "text", text: "Trace the change" },
      { type: "indicate" },
      { type: "wait", seconds: 2 },
      { type: "text", text: concept },
      { type: "circumscribe" },
      { type: "wait", seconds: 2 },
      { type: "flash" },
    ],
    questions: [
      {
        atSec: 45,
        question: `What is the main idea behind ${lessonTitle}?`,
        choices: [concept, "An unrelated topic", "Pure memorization"],
        answerIndex: 0,
      },
      {
        atSec: 105,
        question: "What did the moving dot illustrate?",
        choices: ["A relationship on the graph", "A random animation", "Nothing"],
        answerIndex: 0,
      },
    ],
  };
}
