import { z } from "zod";
import { llmJSON } from "@/lib/llm";
import { createWorkerLogger, type WorkerLogger } from "@/lib/worker-log";
import { getManimRenderEnvironment, manimLlmPreamble } from "./manim-env";
import { ManimRenderError } from "./manim-errors";
import { renderManim } from "./manim";

const fixSchema = z.object({ manimScene: z.string().min(20) });
const MAX_ATTEMPTS = 4;

/** Ensure generated scenes always import Manim symbols. */
export function normalizeManimScene(script: string): string {
  const trimmed = script.trim();
  if (/from\s+manim\s+import/i.test(trimmed)) return trimmed;
  return `from manim import *\n\n${trimmed}\n`;
}

async function fixManimScene(args: {
  scene: string;
  error: string;
  lessonTitle: string;
  attempt: number;
  renderEnv: Awaited<ReturnType<typeof getManimRenderEnvironment>>;
}): Promise<string> {
  const { manimScene } = await llmJSON({
    task: "fixManimScene",
    schema: fixSchema,
    system:
      "You fix broken beat-compiled Manim Community v0.20 scenes. Output strict JSON only. " +
      "Keep ONE self.play or self.wait per logical step — never merge animations. " +
      "Respect the worker environment below.",
    prompt: `${manimLlmPreamble(args.renderEnv)}

Lesson: ${args.lessonTitle}
Fix attempt: ${args.attempt} of ${MAX_ATTEMPTS - 1} (render failed — fix for THIS worker)

Render failure:
${args.error.slice(0, 12_000)}

Broken scene:
${args.scene.slice(0, 12_000)}

Return JSON { manimScene: string } — corrected full Python script.`,
    mock: () => ({ manimScene: normalizeManimScene(args.scene) }),
  });
  return normalizeManimScene(manimScene);
}

function renderErrorDetail(err: unknown): string {
  if (err instanceof ManimRenderError) return err.detail;
  return (err as Error).message;
}

/**
 * Render Manim with normalization + LLM fixer retries. Throws if all attempts fail.
 */
export async function renderManimWithRetries(
  renderId: string,
  sceneScript: string,
  ctx: { lessonTitle: string },
  parentLog?: WorkerLogger
): Promise<{ url: string; sceneScript: string }> {
  const log = parentLog ?? createWorkerLogger("manim-retry", { renderId });
  const renderEnv = await getManimRenderEnvironment();
  let scene = normalizeManimScene(sceneScript);
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    log.debug("render attempt", { attempt, maxAttempts: MAX_ATTEMPTS });
    try {
      const url = await renderManim(renderId, scene, log.child({ scope: "manim" }));
      return { url, sceneScript: scene };
    } catch (err) {
      lastError = renderErrorDetail(err);
      log.warn("render attempt failed", {
        attempt,
        errorPreview: lastError.slice(0, 400),
      });
      if (attempt >= MAX_ATTEMPTS) break;
      log.info("calling manim fixer", {
        attempt,
        nextAttempt: attempt + 1,
        errorBytes: lastError.length,
      });
      scene = await fixManimScene({
        scene,
        error: lastError,
        lessonTitle: ctx.lessonTitle,
        attempt,
        renderEnv,
      });
    }
  }

  throw new Error(
    `Manim render failed after ${MAX_ATTEMPTS} attempts:\n${lastError.slice(0, 2000)}`
  );
}
