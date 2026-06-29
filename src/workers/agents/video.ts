import { llmJSON } from "@/lib/llm";
import { videoSchema, type VideoSpec } from "@/lib/schemas";

/**
 * Subagent: authors a short explainer as a Manim scene + narration + inline
 * comprehension questions. The render worker turns manimScene into an mp4.
 */
export async function writeVideo(args: {
  courseTitle: string;
  lessonTitle: string;
  concepts: string[];
}): Promise<VideoSpec> {
  const concepts = args.concepts.slice(0, 3).join(", ");

  return llmJSON({
    schema: videoSchema,
    system:
      "You are a Manim Community v0.20 animator. Write polished 2D explainer " +
      "scenes that feel like 3Blue1Brown — motion, color, and clarity — but stay " +
      "renderable with `manim -ql`. Output strict JSON only.",
    prompt: `Course: ${args.courseTitle}
Lesson: ${args.lessonTitle}
Concepts: ${concepts}

Return JSON: { title, narration, manimScene, durationSec, questions }

Creative direction:
- Open with a bold title, then build a visual argument step by step
- Use color to encode meaning (highlight what changes, dim what fades)
- Prefer one strong transformation or reveal over a static slide
- Match narration to what's on screen at each beat

manimScene must-haves:
- from manim import * only; one PascalCase *Scene class; construct(self) only
- 6–10 self.play / self.wait calls, ~40–70s total
- Keep it 2D (Scene, not ThreeDScene)

Go for visual interest — pick from:
- Mobjects: Axes, NumberPlane, Arrow, Line, DashedLine, Brace, Dot, Circle, Arc,
  Polygon, Rectangle, RoundedRectangle, Text, MathTex (simple only), VGroup, SurroundingRectangle
- Motion: Create, Write, FadeIn, FadeOut, Transform, ReplacementTransform, TransformMatchingShapes,
  MoveAlongPath, Rotate, GrowArrow, Circumscribe, Flash, Indicate, LaggedStart, AnimationGroup
- Layout: .animate, .shift(), .next_to(), .align_to(), .to_edge(), ValueTracker + always_redraw
  for a sliding dot or morphing bar

Hard limits (these break renders):
- No ImageMobject, SVGMobject, external files, ThreeDScene, Surface, OpenGL-only APIs
- MathTex only for short expressions (e.g. r"F=ma", r"E=mc^2") — no matrices, no \\begin{align}
- No numpy/pandas, no helper functions/classes, no try/except
- Escape quotes in Python strings; keep on-screen text readable

narration: 3–5 sentences, energetic but clear.
durationSec: 40–70.
questions: 1–2 MCQs with atSec inside durationSec.`,
    mock: () => mockVideo(args.lessonTitle, args.concepts),
  });
}

function safeSceneClassName(lessonTitle: string): string {
  const base = lessonTitle.replace(/[^a-zA-Z0-9]/g, "") || "Lesson";
  return `${base}Scene`;
}

function safeLabel(text: string, max = 40): string {
  return text.replace(/["\\]/g, "").slice(0, max);
}

function mockVideo(lessonTitle: string, concepts: string[]): VideoSpec {
  const className = safeSceneClassName(lessonTitle);
  const label = safeLabel(lessonTitle);
  const manimScene = `from manim import *

class ${className}(Scene):
    def construct(self):
        title = Text("${label}", font_size=44, weight=BOLD)
        subtitle = Text("Key idea in motion", font_size=28, color=GRAY).next_to(title, DOWN)
        self.play(Write(title), FadeIn(subtitle, shift=UP))
        self.play(title.animate.to_edge(UP), FadeOut(subtitle))

        axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 2, 1], x_length=6, y_length=3)
        graph = axes.plot(lambda x: 0.35 * x + 0.5, color=BLUE)
        dot = Dot(color=YELLOW).move_to(axes.c2p(-2, -0.2))
        self.play(Create(axes), FadeIn(dot))
        self.play(Create(graph), MoveAlongPath(dot, graph), run_time=2)
        self.play(Flash(dot, color=YELLOW), Circumscribe(graph, color=GREEN))
        self.wait(1)
`;
  return {
    title: lessonTitle,
    narration: `In this short clip we'll unpack ${lessonTitle}. We start from ${
      concepts[0] ?? "first principles"
    }, visualize how the pieces connect, then watch the key transformation happen step by step.`,
    manimScene,
    durationSec: 45,
    questions: [
      {
        atSec: 20,
        question: `What is the main idea behind ${lessonTitle}?`,
        choices: [
          concepts[0] ?? "The core principle",
          "An unrelated topic",
          "Pure memorization",
        ],
        answerIndex: 0,
      },
    ],
  };
}
