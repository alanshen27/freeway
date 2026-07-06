import type { VideoBeat } from "@/lib/schemas";

function pyStr(text: string): string {
  return JSON.stringify(text.replace(/\\/g, "").slice(0, 80));
}

function runTime(beat: { runTime?: number }, fallback: number): number {
  return beat.runTime ?? fallback;
}

/** Human-readable beat label for narration sync prompts. */
export function describeBeat(beat: VideoBeat): string {
  switch (beat.type) {
    case "title":
      return `Title card: "${beat.text}"`;
    case "shift_title_up":
      return "Title moves to top";
    case "text":
      return `Caption: "${beat.text}"`;
    case "wait":
      return `Pause (${beat.seconds}s)`;
    case "fade_out":
      return "Screen clears";
    case "axes":
      return "Coordinate axes appear";
    case "plot_line":
      return `Line drawn on axes (slope ${beat.slope ?? 0.35})`;
    case "place_dot":
      return "Dot appears on the line";
    case "move_dot":
      return "Dot travels along the line";
    case "indicate":
      return "Highlight the last object";
    case "circumscribe":
      return "Box around the last object";
    case "flash":
      return "Flash emphasis";
  }
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
  // Long beat lists are allowed — cap generously so narration length keeps up.
  return Math.round(Math.max(60, Math.min(480, total)));
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
  let titleAtTop = false;
  let captionVar: string | null = null;
  let axesVar: string | null = null;
  let graphVar: string | null = null;
  let dotVar: string | null = null;
  let lastMob: string | null = null;
  const active: string[] = [];

  const track = (name: string) => {
    lastMob = name;
    active.push(name);
  };

  const untrack = (name: string) => {
    const idx = active.indexOf(name);
    if (idx !== -1) active.splice(idx, 1);
    if (lastMob === name) lastMob = active[active.length - 1] ?? null;
  };

  /** Cap width so long Text lines never overflow the 14-unit frame. */
  const fitWidth = (name: string, max: number) =>
    `        if ${name}.width > ${max}: ${name}.scale_to_fit_width(${max})`;

  for (const beat of normalizeVideoBeats(beats)) {
    switch (beat.type) {
      case "title": {
        lines.push(
          `        title = Text(${pyStr(beat.text)}, font_size=44, weight=BOLD)`
        );
        lines.push(fitWidth("title", 12));
        lines.push(`        self.play(Write(title), run_time=${runTime(beat, 2.5)})`);
        hasTitle = true;
        titleAtTop = false;
        track("title");
        break;
      }
      case "shift_title_up":
        if (hasTitle && !titleAtTop) {
          lines.push(
            `        self.play(title.animate.to_edge(UP), run_time=${runTime(beat, 1)})`
          );
          titleAtTop = true;
        }
        break;
      case "text": {
        const name = `caption_${++labelCounter}`;
        // A centered title would collide with the caption — park it at the top first.
        if (hasTitle && !titleAtTop) {
          lines.push(`        self.play(title.animate.to_edge(UP), run_time=1)`);
          titleAtTop = true;
        }
        lines.push(`        ${name} = Text(${pyStr(beat.text)}, font_size=30)`);
        lines.push(fitWidth(name, 11));
        if (hasTitle) {
          lines.push(`        ${name}.next_to(title, DOWN, buff=0.45)`);
        } else {
          lines.push(`        ${name}.to_edge(UP, buff=0.8)`);
        }
        // Replace the previous caption — never draw new text over old text.
        if (captionVar) {
          lines.push(
            `        self.play(FadeOut(${captionVar}), FadeIn(${name}, shift=UP), run_time=${runTime(beat, 2.5)})`
          );
          untrack(captionVar);
        } else {
          lines.push(
            `        self.play(FadeIn(${name}, shift=UP), run_time=${runTime(beat, 2.5)})`
          );
        }
        captionVar = name;
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
        // Everything on screen is gone — later beats must not reference it.
        hasTitle = false;
        titleAtTop = false;
        captionVar = null;
        axesVar = null;
        graphVar = null;
        dotVar = null;
        break;
      case "axes":
        // Keep the header area clear before the graph takes the stage.
        if (hasTitle && !titleAtTop) {
          lines.push(`        self.play(title.animate.to_edge(UP), run_time=1)`);
          titleAtTop = true;
        }
        axesVar = "axes";
        graphVar = null;
        dotVar = null;
        lines.push(
          "        axes = Axes(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=6, y_length=3.5)"
        );
        lines.push(`        axes.shift(DOWN * 0.4)`);
        lines.push(`        self.play(Create(axes), run_time=${runTime(beat, 2.5)})`);
        track(axesVar);
        break;
      case "plot_line": {
        if (!axesVar) {
          if (hasTitle && !titleAtTop) {
            lines.push(`        self.play(title.animate.to_edge(UP), run_time=1)`);
            titleAtTop = true;
          }
          axesVar = "axes";
          lines.push(
            "        axes = Axes(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=6, y_length=3.5)"
          );
          lines.push(`        axes.shift(DOWN * 0.4)`);
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
          graphVar
            ? `        ${dotVar} = Dot(color=YELLOW).move_to(${graphVar}.get_start())`
            : `        ${dotVar} = Dot(color=YELLOW).move_to(${axesVar}.c2p(-2, -0.7))`
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
