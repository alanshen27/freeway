import OpenAI from "openai";
import { z } from "zod";
import { env, features, isProd } from "./env";

let client: OpenAI | null = null;
function getClient() {
  if (!features.llm) return null;
  if (!client)
    client = new OpenAI({
      apiKey: env.openaiKey,
      // Network-level resilience for the real path.
      timeout: 120_000,
      maxRetries: 2,
    });
  return client;
}

/** Thrown when generation is attempted in production without an LLM configured. */
export class LLMNotConfiguredError extends Error {
  constructor() {
    super(
      "OpenAI is not configured. Set OPENAI_API_KEY to enable AI generation."
    );
    this.name = "LLMNotConfiguredError";
  }
}

type LLMArgs<T> = {
  system: string;
  prompt: string;
  // Any zod schema; the returned type T is inferred from `mock`.
  schema: z.ZodTypeAny;
  /** Dev-only deterministic fallback. Never used in production. */
  mock: () => T;
};

function isRetryableLlmError(err: unknown) {
  const msg = (err as Error).message ?? String(err);
  const code = (err as { code?: string }).code;
  return (
    msg.includes("timed out") ||
    msg.includes("Timeout") ||
    msg.includes("ECONNRESET") ||
    code === "ETIMEDOUT"
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ask the model for JSON conforming to `schema`.
 *
 * - With OPENAI_API_KEY set: calls the model, re-asking once on a schema
 *   mismatch, and throws if it still can't produce valid output (so the job
 *   fails visibly instead of fabricating content).
 * - Without a key: in development returns `mock()` so you can work offline; in
 *   production throws `LLMNotConfiguredError`.
 */
export async function llmJSON<T>({
  system,
  prompt,
  schema,
  mock,
}: LLMArgs<T>): Promise<T> {
  const openai = getClient();
  if (!openai) {
    if (isProd) throw new LLMNotConfiguredError();
    return mock();
  }

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const messages = [
      { role: "system" as const, content: system },
      { role: "user" as const, content: prompt },
    ];
    if (attempt > 0) {
      messages.push({
        role: "user" as const,
        content: `Your previous reply was invalid (${lastError}). Reply again with ONLY valid JSON matching the requested shape.`,
      });
    }

    try {
      const res = await openai.chat.completions.create({
        model: env.openaiModel,
        response_format: { type: "json_object" },
        messages,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        lastError = "not parseable JSON";
        continue;
      }
      const parsed = schema.safeParse(json);
      if (parsed.success) return parsed.data as T;
      lastError = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (err) {
      if (isRetryableLlmError(err) && attempt < 2) {
        lastError = (err as Error).message;
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  // Exhausted retries.
  if (isProd) {
    throw new Error(`LLM produced invalid output: ${lastError}`);
  }
  console.warn("[llm] schema mismatch after retries, using mock:", lastError);
  return mock();
}

type VisionContent = OpenAI.Chat.Completions.ChatCompletionContentPart[];

/**
 * Vision-capable JSON call — sends images (URLs or data URIs) alongside text.
 */
export async function llmVisionJSON<T>({
  system,
  content,
  schema,
  mock,
}: {
  system: string;
  content: VisionContent;
  schema: z.ZodTypeAny;
  mock: () => T;
}): Promise<T> {
  const openai = getClient();
  if (!openai) {
    if (isProd) throw new LLMNotConfiguredError();
    return mock();
  }

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content },
    ];
    if (attempt > 0) {
      messages.push({
        role: "user",
        content: `Your previous reply was invalid (${lastError}). Reply again with ONLY valid JSON matching the requested shape.`,
      });
    }

    try {
      const res = await openai.chat.completions.create({
        model: env.openaiModel,
        response_format: { type: "json_object" },
        messages,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        lastError = "not parseable JSON";
        continue;
      }
      const parsed = schema.safeParse(json);
      if (parsed.success) return parsed.data as T;
      lastError = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (err) {
      console.warn("[llm] vision request failed:", (err as Error).message);
      return mock();
    }
  }

  console.warn("[llm] vision schema mismatch after retries, using mock:", lastError);
  return mock();
}

/**
 * Free-form text (grading feedback, forum tutor replies).
 *
 * Configuration errors throw in production; transient runtime errors fall back
 * to `mock()` because this output is supplementary, not the core artifact.
 */
export async function llmText({
  system,
  prompt,
  mock,
}: {
  system: string;
  prompt: string;
  mock: () => string;
}): Promise<string> {
  const openai = getClient();
  if (!openai) {
    if (isProd) throw new LLMNotConfiguredError();
    return mock();
  }
  try {
    const res = await openai.chat.completions.create({
      model: env.openaiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || mock();
  } catch (err) {
    console.warn("[llm] text request failed:", (err as Error).message);
    return mock();
  }
}
