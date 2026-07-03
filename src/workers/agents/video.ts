import { llmJSON, llmText } from "@/lib/llm";
import { videoBeatPlanSchema, type VideoBeat, type VideoSpec } from "@/lib/schemas";
import { getManimRenderEnvironment, manimLlmPreamble } from "@/workers/render/manim-env";
import {
  compileBeatsToManim,
  describeBeat,
  estimateDurationFromBeats,
} from "@/workers/render/manim-compile";

/**
 * Subagent: plans beats, writes lesson-specific narration, compiles to Manim.
 */
export async function writeVideo(args: {
  courseTitle: string;
  lessonTitle: string;
  concepts: string[];
}): Promise<VideoSpec> {
  const concepts = args.concepts.filter(Boolean);
  const conceptLine = concepts.slice(0, 3).join("; ");
  const renderEnv = await getManimRenderEnvironment();

  const plan = await llmJSON({
    task: "planVideoBeats",
    schema: videoBeatPlanSchema,
    system:
      "You plan Manim explainer videos as an ordered list of BEATS. Each beat is " +
      "exactly ONE on-screen action. On-screen text must be short, grammatical, and " +
      "specific to the lesson — never paste raw learning objectives verbatim. JSON only.",
    prompt: `${manimLlmPreamble(renderEnv)}

Course: ${args.courseTitle}
Lesson: ${args.lessonTitle}
Learning goals: ${conceptLine || "core lesson ideas"}

Return JSON: { title, durationSec, beats, questions }

BEAT PLANNING:
- 14–20 beats, one visual action each (compiler emits one self.play or self.wait)
- title.text = lesson name (short)
- text beats: 3–8 words max, complete phrase (e.g. "Rows become vectors", not "Apply linear algebra operations (matrix")
- Never truncate mid-word or mid-parenthesis in on-screen text
- Typical arc: title → shift_title_up → 2–4 text → fade_out → axes → plot_line → place_dot → move_dot → text → indicate → wait → circumscribe → wait
- questions: 2 MCQs tied to THIS lesson, atSec spread across durationSec (90–150)

Beat types: title, shift_title_up, text, wait, fade_out, axes, plot_line, place_dot, move_dot, indicate, circumscribe, flash`,
    mock: () => mockBeatPlan(args.lessonTitle, concepts),
  });

  const durationSec = Math.max(plan.durationSec, estimateDurationFromBeats(plan.beats));
  const beatOutline = plan.beats
    .map((b, i) => `${i + 1}. ${describeBeat(b)}`)
    .join("\n");

  const narration = await llmText({
    task: "writeVideoNarration",
    system:
      "You write voiceover scripts for educational explainer videos. Sound like a clear, " +
      "engaging instructor — not a template. Complete sentences only. Plain spoken English.",
    prompt: `Course: ${args.courseTitle}
Lesson: ${args.lessonTitle}
Key ideas: ${conceptLine || args.lessonTitle}
Target length: ${durationSec} seconds (~${Math.round(durationSec * 2.2)} words)

Visual sequence (sync your narration to these moments):
${beatOutline}

Write the full voiceover as one paragraph (8–12 sentences):
- Teach "${args.lessonTitle}" specifically — use the key ideas above
- Walk through what appears on screen in order (title, captions, graph, moving dot)
- NO generic filler ("big picture", "let the idea land", "pieces fit together", "one step at a time")
- NO incomplete phrases or cut-off words
- NO meta talk about "beats" or "captions"
- Define terms briefly when first mentioned
- End with one concrete takeaway from this lesson`,
    mock: () => mockNarration(args.lessonTitle, concepts),
  });

  const className = safeSceneClassName(args.lessonTitle);
  const manimScene = compileBeatsToManim(className, plan.beats);

  return {
    title: plan.title,
    narration: narration.trim(),
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

function safeCaption(text: string, max = 48): string {
  const clean = text.replace(/["\\]/g, "").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf(","));
  return (breakAt > 12 ? slice.slice(0, breakAt) : slice).trim();
}

function conceptHook(concepts: string[], lessonTitle: string): string {
  const raw = concepts[0]?.trim();
  if (!raw) return lessonTitle.toLowerCase();
  if (raw.length <= 72) return raw.replace(/\.$/, "");
  const slice = raw.slice(0, 72);
  const breakAt = slice.lastIndexOf(" ");
  return (breakAt > 20 ? slice.slice(0, breakAt) : slice).replace(/\($/, "").trim();
}

function mockBeatPlan(lessonTitle: string, concepts: string[]) {
  const label = safeCaption(lessonTitle, 44);
  const hook = conceptHook(concepts, lessonTitle);
  return {
    title: lessonTitle,
    durationSec: 120,
    beats: [
      { type: "title" as const, text: label },
      { type: "shift_title_up" as const },
      { type: "text" as const, text: safeCaption(hook, 40) },
      { type: "wait" as const, seconds: 2 },
      { type: "text" as const, text: "Build the idea visually" },
      { type: "wait" as const, seconds: 1.5 },
      { type: "fade_out" as const },
      { type: "axes" as const },
      { type: "plot_line" as const, slope: 0.35 },
      { type: "place_dot" as const },
      { type: "move_dot" as const, runTime: 4 },
      { type: "text" as const, text: "Change along the line" },
      { type: "indicate" as const },
      { type: "wait" as const, seconds: 2 },
      { type: "text" as const, text: safeCaption(`Takeaway: ${hook}`, 44) },
      { type: "circumscribe" as const },
      { type: "wait" as const, seconds: 2 },
      { type: "flash" as const },
    ],
    questions: [
      {
        atSec: 45,
        question: `What topic does this lesson introduce?`,
        choices: [lessonTitle, "Unrelated history", "Memorization drills"],
        answerIndex: 0,
      },
      {
        atSec: 105,
        question: "What did the graph and moving dot show?",
        choices: [
          "How one quantity changes along the line",
          "A random animation",
          "Nothing — decoration only",
        ],
        answerIndex: 0,
      },
    ],
  };
}

function mockNarration(lessonTitle: string, concepts: string[]): string {
  const hook = conceptHook(concepts, lessonTitle);
  return (
    `This lesson is about ${lessonTitle}. ` +
    `We'll focus on ${hook}, and why it shows up in biological data analysis. ` +
    `First you'll see the title, then a few captions that name the core idea. ` +
    `Next we clear the screen and draw axes — a simple stand-in for how two quantities relate. ` +
    `Watch the line appear, then a dot that travels along it: that motion is the relationship we care about. ` +
    `When the dot reaches the highlight, think about what changed and what stayed fixed. ` +
    `By the end, you should be able to explain in your own words how ${hook} connects to the graph you just saw.`
  );
}
