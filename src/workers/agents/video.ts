import { llmJSON, llmText } from "@/lib/llm";
import { scaleForCourse } from "@/lib/course-scale";
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
  isTaster?: boolean;
  durationWeeks?: number;
}): Promise<VideoSpec> {
  const concepts = args.concepts.filter(Boolean);
  const conceptLine = concepts.slice(0, 4).join("; ");
  const renderEnv = await getManimRenderEnvironment();
  const scale = scaleForCourse({
    durationWeeks: args.durationWeeks ?? 8,
    isTaster: args.isTaster,
  });
  const { min: durMin, max: durMax } = scale.videoDurationSec;
  const { min: beatMin, max: beatMax } = scale.videoBeatCount;

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
- ${beatMin}–${beatMax} beats, one visual action each (compiler emits one self.play or self.wait)
- durationSec: ${durMin}–${durMax} seconds (target ~${Math.round((durMin + durMax) / 2)}s for full lessons)
- title.text = lesson name (short)
- text beats: 3–8 words max, complete phrase
- Build a full mini-lesson arc: title → captions → clear screen → graph/demo → highlight → recap
- Include multiple text beats, waits, graph sequences (axes, plot_line, place_dot, move_dot), and emphasis (indicate, circumscribe, flash)
- questions: 2–3 MCQs tied to THIS lesson, atSec spread across durationSec

Beat types: title, shift_title_up, text, wait, fade_out, axes, plot_line, place_dot, move_dot, indicate, circumscribe, flash`,
    mock: () => mockBeatPlan(args.lessonTitle, concepts, scale),
  });

  const durationSec = Math.max(
    plan.durationSec,
    estimateDurationFromBeats(plan.beats),
    args.isTaster ? 90 : durMin
  );
  const beatOutline = plan.beats
    .map((b, i) => `${i + 1}. ${describeBeat(b)}`)
    .join("\n");

  const wordTarget = Math.round(durationSec * 2.2);

  const narration = await llmText({
    task: "writeVideoNarration",
    system:
      "You write voiceover scripts for educational explainer videos. Sound like a clear, " +
      "engaging instructor — not a template. Complete sentences only. Plain spoken English.",
    prompt: `Course: ${args.courseTitle}
Lesson: ${args.lessonTitle}
Key ideas: ${conceptLine || args.lessonTitle}
Target length: ${durationSec} seconds (~${wordTarget} words)

Visual sequence (sync your narration to these moments):
${beatOutline}

Write the full voiceover (${args.isTaster ? "6–8" : "12–18"} sentences):
- Teach "${args.lessonTitle}" specifically — use the key ideas above
- Walk through what appears on screen in order (title, captions, graph, moving dot, highlights)
- NO generic filler or incomplete phrases
- Define terms briefly when first mentioned
- End with one concrete takeaway from this lesson`,
    mock: () => mockNarration(args.lessonTitle, concepts, args.isTaster),
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

function mockBeatPlan(
  lessonTitle: string,
  concepts: string[],
  scale: ReturnType<typeof scaleForCourse>
) {
  const label = safeCaption(lessonTitle, 44);
  const hook = conceptHook(concepts, lessonTitle);
  const long = !scale.lessonsPerModule || scale.lessonsPerModule >= 5;
  const beats: VideoBeat[] = long
    ? [
        { type: "title", text: label },
        { type: "shift_title_up" },
        { type: "text", text: safeCaption(hook, 40) },
        { type: "wait", seconds: 2 },
        { type: "text", text: "Start with the core idea" },
        { type: "wait", seconds: 1.5 },
        { type: "text", text: "Then see it visually" },
        { type: "fade_out" },
        { type: "axes" },
        { type: "plot_line", slope: 0.35 },
        { type: "place_dot" },
        { type: "move_dot", runTime: 5 },
        { type: "text", text: "Track the change" },
        { type: "indicate" },
        { type: "wait", seconds: 2 },
        { type: "text", text: "Connect to real data" },
        { type: "circumscribe" },
        { type: "wait", seconds: 2 },
        { type: "text", text: safeCaption(`Takeaway: ${hook}`, 44) },
        { type: "flash" },
        { type: "wait", seconds: 2 },
      ]
    : [
        { type: "title", text: label },
        { type: "shift_title_up" },
        { type: "text", text: safeCaption(hook, 40) },
        { type: "wait", seconds: 2 },
        { type: "text", text: "Build the idea visually" },
        { type: "fade_out" },
        { type: "axes" },
        { type: "plot_line", slope: 0.35 },
        { type: "place_dot" },
        { type: "move_dot", runTime: 4 },
        { type: "indicate" },
        { type: "wait", seconds: 2 },
        { type: "flash" },
      ];

  return {
    title: lessonTitle,
    durationSec: long ? 240 : 120,
    beats,
    questions: [
      {
        atSec: long ? 80 : 45,
        question: `What topic does this lesson introduce?`,
        choices: [lessonTitle, "Unrelated history", "Memorization drills"],
        answerIndex: 0,
      },
      {
        atSec: long ? 200 : 105,
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

function mockNarration(lessonTitle: string, concepts: string[], isTaster?: boolean): string {
  const hook = conceptHook(concepts, lessonTitle);
  if (isTaster) {
    return (
      `This lesson is about ${lessonTitle}. ` +
      `We'll focus on ${hook}. ` +
      `Watch the title, captions, then the graph with a dot moving along the line. ` +
      `By the end you should explain how ${hook} shows up in the animation.`
    );
  }
  return (
    `This lesson is about ${lessonTitle}. ` +
    `We'll build from ${hook} to a visual model you can reuse on real problems. ` +
    `First the title and key captions name what matters. ` +
    `Then we clear the screen and draw axes — a stand-in for two related quantities. ` +
    `Watch the line appear, then a dot traveling along it: that motion is the relationship we care about. ` +
    `When we highlight the dot, think about what changed and what stayed fixed. ` +
    `We pause on a second caption to connect the graph back to data you might see in practice. ` +
    `The final recap states the takeaway in plain language. ` +
    `By the end, you should explain in your own words how ${hook} connects to the graph you just saw.`
  );
}
