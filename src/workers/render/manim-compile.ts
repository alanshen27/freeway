import type { VideoBeat } from "@/lib/schemas";

function pyStr(text: string): string {
  return JSON.stringify(text.replace(/\\/g, "").slice(0, 80));
}

function runTime(beat: { runTime?: number }, fallback: number): number {
  return beat.runTime ?? fallback;
}

/** Insert missing axes/graph beats so the compiler never emits broken references. */
export function normalizeVideoBeats(beats: VideoBeat[]): VideoBeat[] {
  const out: VideoBeat[] = [];
  let hasAxes = false;
  let hasGraph = false;

  for (const beat of beats) {
    const needsAxes =
      beat.type === "plot_line" ||
      beat.type === "place_dot" ||
      beat.type === "move_dot";
    if (needsAxes && !hasAxes) {
      out.push({ type: "axes" });
      hasAxes = true;
    }
    if (
      (beat.type === "place_dot" || beat.type === "move_dot") &&
      !hasGraph
    ) {
      out.push({ type: "plot_line" });
      hasGraph = true;
    }
    if (beat.type === "axes") hasAxes = true;
    if (beat.type === "plot_line") hasGraph = true;
    out.push(beat);
  }
  return out;
}

export function estimateDurationFromBeats(beats: VideoBeat[]): number {
  let total = 0;
  for (const b of beats) {
    switch (b.type) {
      case "wait":
        total += b.seconds;
        break;
      case "title":
        total += runTime(b, 2.5);
        break;
      case "shift_title_up":
        total += runTime(b, 1);
        break;
      case "text":
        total += runTime(b, 2.5);
        break;
      case "fade_out":
        total += runTime(b, 1.5);
        break;
      case "axes":
        total += runTime(b, 2.5);
        break;
      case "plot_line":
        total += runTime(b, 3.5);
        break;
      case "place_dot":
        total += runTime(b, 1.5);
        break;
      case "move_dot":
        total += runTime(b, 4);
        break;
      case "indicate":
      case "circumscribe":
        total += runTime(b, 2);
        break;
      case "flash":
        total += runTime(b, 1);
        break;
    }
  }
  return Math.round(Math.max(90, Math.min(180, total)));
}

/**
 * Turn a beat list into Manim Python — exactly one self.play or self.wait per beat.
 * The LLM plans beats; this compiler emits reliable code (no multi-action plays).
 */
export function compileBeatsToManim(
  className: string,
  beats: VideoBeat[]
): string {
  const lines = [
    "from manim import *",
    "",
    `class ${className}(Scene):`,
    "    def construct(self):",
  ];

  let labelCounter = 0;
  let hasTitle = false;
  let axesVar: string | null = null;
  let graphVar: string | null = null;
  let dotVar: string | null = null;
  let lastMob: string | null = null;
  const active: string[] = [];

  const track = (name: string) => {
    lastMob = name;
    active.push(name);
  };

  for (const beat of normalizeVideoBeats(beats)) {
    switch (beat.type) {
      case "title": {
        lines.push(
          `        title = Text(${pyStr(beat.text)}, font_size=44, weight=BOLD)`
        );
        lines.push(`        self.play(Write(title), run_time=${runTime(beat, 2.5)})`);
        hasTitle = true;
        track("title");
        break;
      }
      case "shift_title_up":
        if (hasTitle) {
          lines.push(
            `        self.play(title.animate.to_edge(UP), run_time=${runTime(beat, 1)})`
          );
        }
        break;
      case "text": {
        const name = `caption_${++labelCounter}`;
        lines.push(`        ${name} = Text(${pyStr(beat.text)}, font_size=30)`);
        if (hasTitle) {
          lines.push(`        ${name}.next_to(title, DOWN, buff=0.45)`);
        }
        lines.push(
          `        self.play(FadeIn(${name}, shift=UP), run_time=${runTime(beat, 2.5)})`
        );
        track(name);
        break;
      }
      case "wait":
        lines.push(`        self.wait(${beat.seconds})`);
        break;
      case "fade_out":
        if (active.length) {
          lines.push(
            `        self.play(${active.map((v) => `FadeOut(${v})`).join(", ")}, run_time=${runTime(beat, 1.5)})`
          );
          active.length = 0;
          lastMob = null;
        }
        break;
      case "axes":
        axesVar = "axes";
        graphVar = null;
        dotVar = null;
        lines.push(
          "        axes = Axes(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=6, y_length=3.5)"
        );
        lines.push(`        self.play(Create(axes), run_time=${runTime(beat, 2.5)})`);
        track(axesVar);
        break;
      case "plot_line": {
        if (!axesVar) {
          axesVar = "axes";
          lines.push(
            "        axes = Axes(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=6, y_length=3.5)"
          );
          lines.push(`        self.play(Create(axes), run_time=2.5)`);
          track(axesVar);
        }
        const slope = beat.slope ?? 0.35;
        graphVar = `graph_${++labelCounter}`;
        lines.push(
          `        ${graphVar} = ${axesVar}.plot(lambda x: ${slope} * x, color=BLUE)`
        );
        lines.push(
          `        self.play(Create(${graphVar}), run_time=${runTime(beat, 3.5)})`
        );
        track(graphVar);
        break;
      }
      case "place_dot": {
        if (!axesVar) break;
        dotVar = `dot_${++labelCounter}`;
        lines.push(
          `        ${dotVar} = Dot(color=YELLOW).move_to(${axesVar}.c2p(-2, -0.7))`
        );
        lines.push(
          `        self.play(FadeIn(${dotVar}), run_time=${runTime(beat, 1.5)})`
        );
        track(dotVar);
        break;
      }
      case "move_dot":
        if (dotVar && graphVar) {
          lines.push(
            `        self.play(MoveAlongPath(${dotVar}, ${graphVar}), run_time=${runTime(beat, 4)})`
          );
        }
        break;
      case "indicate":
        if (lastMob) {
          lines.push(
            `        self.play(Indicate(${lastMob}, color=YELLOW), run_time=${runTime(beat, 2)})`
          );
        }
        break;
      case "circumscribe":
        if (lastMob) {
          lines.push(
            `        self.play(Circumscribe(${lastMob}, color=GREEN), run_time=${runTime(beat, 2)})`
          );
        }
        break;
      case "flash":
        if (lastMob) {
          lines.push(
            `        self.play(Flash(${lastMob}, color=YELLOW), run_time=${runTime(beat, 1)})`
          );
        }
        break;
    }
  }

  lines.push("");
  return lines.join("\n");
}
