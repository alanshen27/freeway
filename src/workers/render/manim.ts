import { spawn } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  copyFile,
  mkdir,
  readdir,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { env, features } from "@/lib/env";
import { uploadVideoToStorage } from "@/lib/supabase/storage";
import { createWorkerLogger, type WorkerLogger } from "@/lib/worker-log";
import { ManimRenderError } from "./manim-errors";

const PUBLIC_DIR = path.join(process.cwd(), "public", "generated", "videos");

function assertManimEnabled() {
  if (!features.manim) {
    throw new Error(
      "Video sections require MANIM_ENABLED=1 on the worker. Install Manim and restart the worker."
    );
  }
}

function verifyManimOnPath(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(env.manimBin, ["--version"], { stdio: "ignore" });
    proc.on("error", () =>
      reject(
        new Error(
          `Manim not found (\`${env.manimBin}\`). Install it on the worker machine: pip install manim`
        )
      )
    );
    proc.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`manim --version exited with code ${code ?? "unknown"}`))
    );
  });
}

/**
 * Render a Manim scene to mp4. Throws if Manim is missing or render fails.
 * Only runs on the worker — the Next.js app never calls this.
 */
export async function renderManim(
  videoId: string,
  sceneScript: string,
  parentLog?: WorkerLogger
): Promise<string> {
  const log = parentLog ?? createWorkerLogger("manim", { videoId });
  const startedAt = performance.now();

  assertManimEnabled();
  if (!sceneScript.trim()) {
    throw new Error("Manim scene script is empty");
  }

  log.debug("render starting", { scriptBytes: sceneScript.length });

  await verifyManimOnPath();

  const sceneMatch = sceneScript.match(/class\s+(\w+)\s*\(/);
  const sceneName = sceneMatch?.[1];
  if (!sceneName) {
    throw new Error("Manim scene script has no Scene class");
  }

  log.debug("scene identified", { sceneName });

  const work = await mkdtemp(path.join(tmpdir(), "manim-"));
  const scenePath = path.join(work, "scene.py");
  await writeFile(scenePath, sceneScript, "utf8");

  await new Promise<void>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(
      env.manimBin,
      ["-ql", "--format", "mp4", "-o", "out", scenePath, sceneName],
      { cwd: work }
    );
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) return resolve();
      const err = new ManimRenderError(code, stdout, stderr);
      log.error("manim process failed", {
        exitCode: code ?? "unknown",
        detailPreview: err.detail.slice(0, 400),
      });
      reject(err);
    });
  });

  const found = await findMp4(path.join(work, "media"));
  if (!found) {
    throw new Error("Manim finished but produced no mp4 output");
  }

  const buffer = await readFile(found);
  const uploaded = await uploadVideoToStorage(`${videoId}.mp4`, buffer);
  if (uploaded) {
    log.info("render uploaded", {
      durationMs: Math.round(performance.now() - startedAt),
      url: uploaded,
      bytes: buffer.length,
    });
    return uploaded;
  }

  await mkdir(PUBLIC_DIR, { recursive: true });
  const dest = path.join(PUBLIC_DIR, `${videoId}.mp4`);
  await copyFile(found, dest);
  const localUrl = `/generated/videos/${videoId}.mp4`;
  log.info("render saved locally", {
    durationMs: Math.round(performance.now() - startedAt),
    url: localUrl,
    bytes: buffer.length,
  });
  return localUrl;
}

async function findMp4(dir: string): Promise<string | null> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const nested = await findMp4(full);
        if (nested) return nested;
      } else if (e.name.endsWith(".mp4")) {
        return full;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
