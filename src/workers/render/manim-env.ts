import { spawn } from "node:child_process";
import { env } from "@/lib/env";

export type ManimRenderEnvironment = {
  manimBin: string;
  manimVersion: string | null;
  pythonVersion: string | null;
  ffmpeg: { available: boolean; version: string | null };
  latex: { available: boolean; command: string | null; version: string | null };
  dvisvgm: { available: boolean; version: string | null };
  /** One block to paste into LLM prompts. */
  llmContext: string;
};

function runCommand(
  bin: string,
  args: string[],
  timeoutMs = 12_000
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ code: null, stdout, stderr: `${stderr}\n(timed out)`.trim() });
    }, timeoutMs);
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr });
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function firstLine(text: string): string | null {
  const line = text.trim().split("\n").find(Boolean);
  return line?.trim() ?? null;
}

async function probeBinary(
  bin: string,
  versionArgs: string[] = ["--version"]
): Promise<{ available: boolean; version: string | null }> {
  const { code, stdout, stderr } = await runCommand(bin, versionArgs);
  if (code !== 0 && !stdout && !stderr) return { available: false, version: null };
  return {
    available: code === 0 || Boolean(stdout.trim() || stderr.trim()),
    version: firstLine(stdout) ?? firstLine(stderr),
  };
}

async function probeLatex(): Promise<{
  available: boolean;
  command: string | null;
  version: string | null;
}> {
  for (const cmd of ["latex", "pdflatex", "xelatex"]) {
    const hit = await probeBinary(cmd);
    if (hit.available) {
      return { available: true, command: cmd, version: hit.version };
    }
  }
  return { available: false, command: null, version: null };
}

function buildLlmContext(probe: Omit<ManimRenderEnvironment, "llmContext">): string {
  const lines = [
    "WORKER RENDER ENVIRONMENT (probed on this machine — obey these limits):",
    `- Manim binary: ${probe.manimBin}`,
    `- Manim version: ${probe.manimVersion ?? "NOT FOUND — scenes cannot render"}`,
    `- Python: ${probe.pythonVersion ?? "unknown"}`,
    `- FFmpeg: ${
      probe.ffmpeg.available
        ? probe.ffmpeg.version ?? "available"
        : "NOT FOUND — video encode will fail"
    }`,
    `- LaTeX (${probe.latex.command ?? "none"}): ${
      probe.latex.available
        ? probe.latex.version ?? "available"
        : "NOT INSTALLED"
    }`,
    `- dvisvgm: ${
      probe.dvisvgm.available
        ? probe.dvisvgm.version ?? "available"
        : "not found (usually OK for Text-only scenes)"
    }`,
    "",
    probe.latex.available
      ? "LaTeX IS available — MathTex/Tex allowed for simple expressions only."
      : "LaTeX IS NOT available — NEVER use MathTex, Tex, TexTemplate. Use Text() for all labels and math.",
    manimSceneRules(probe.latex.available),
  ];
  return lines.join("\n");
}

/** Shared Manim authoring constraints — used by writeVideo + fixManimScene. */
export function manimSceneRules(latexAvailable: boolean): string {
  const tex = latexAvailable
    ? "MathTex OK for trivial expressions; prefer Text when possible"
    : "Text() ONLY for all labels and math — no MathTex/Tex";
  return [
    "Scene rules (beat-compiled — do not merge steps when fixing):",
    "- from manim import *; one PascalCase Scene subclass; construct(self) only; 2D Scene",
    "- Exactly ONE self.play() or self.wait() per beat — never combine unrelated animations in one play",
    "- Never use AnimationGroup, LaggedStart, or multiple Create/Transform in a single self.play",
    `- ${tex}`,
    "- Allowed: Text, Axes, Dot, Create, Write, FadeIn, FadeOut, MoveAlongPath, Indicate, Circumscribe, Flash",
    "- Forbidden: ImageMobject, SVGMobject, external files, ThreeDScene, numpy/pandas, helper classes, try/except",
  ].join("\n");
}

/** Env probe + scene rules — paste at top of any Manim LLM prompt. */
export function manimLlmPreamble(env: ManimRenderEnvironment): string {
  return env.llmContext;
}

let cached: ManimRenderEnvironment | null = null;
let cachePromise: Promise<ManimRenderEnvironment> | null = null;

/** Probe Manim/LaTeX/ffmpeg once per worker process. */
export async function getManimRenderEnvironment(): Promise<ManimRenderEnvironment> {
  if (cached) return cached;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const [manim, ffmpeg, latex, dvisvgm] = await Promise.all([
      probeBinary(env.manimBin),
      probeBinary("ffmpeg"),
      probeLatex(),
      probeBinary("dvisvgm"),
    ]);
    let python = await probeBinary("python3");
    if (!python.available) python = await probeBinary("python");

    const base = {
      manimBin: env.manimBin,
      manimVersion: manim.version,
      pythonVersion: python.version,
      ffmpeg: { available: ffmpeg.available, version: ffmpeg.version },
      latex: {
        available: latex.available,
        command: latex.command,
        version: latex.version,
      },
      dvisvgm: { available: dvisvgm.available, version: dvisvgm.version },
    };

    cached = { ...base, llmContext: buildLlmContext(base) };
    return cached;
  })();

  return cachePromise;
}

/** Force re-probe (e.g. after installing LaTeX mid-session). */
export function clearManimEnvironmentCache() {
  cached = null;
  cachePromise = null;
}
