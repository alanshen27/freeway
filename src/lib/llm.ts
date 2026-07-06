import OpenAI from "openai";
import { z } from "zod";
import { features } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { recordLlmUsage } from "./llm/cost";
import {
  modelMapping,
  planCourseFallback,
  type ChatModelConfig,
} from "./llm/models";
import {
  getProviderClient,
  isChatProviderConfigured,
  resolveChatConfig,
  resolveVisionConfig,
} from "./llm/providers";
import {
  runStrictToolCompletion,
  strictToolsEnabled,
} from "./llm/structured-output";

const log = createLogger("llm");

export { modelMapping } from "./llm/models";
export {
  getLlmCostSummary,
  recordLlmUsage,
  runWithLlmCostContext,
  type LlmCostSummary,
  type LlmUsageRecord,
} from "./llm/cost";

/** Thrown when generation is attempted without an LLM configured. */
export class LLMNotConfiguredError extends Error {
  constructor() {
    super(
      "LLM is not configured. Set DEEPSEEK_API_KEY (and OPENAI_API_KEY for images / vision fallback)."
    );
    this.name = "LLMNotConfiguredError";
  }
}

/** Thrown when the model returns unusable output and mock fallback is disabled. */
export class LLMGenerationError extends Error {
  constructor(task: string, detail: string) {
    super(`${task} failed: ${detail}`);
    this.name = "LLMGenerationError";
  }
}

type LLMArgs<T> = {
  system: string;
  prompt: string;
  schema: z.ZodTypeAny;
  /** Only used when LLM_ALLOW_MOCK=1 (seed/offline). Never for production generation. */
  mock: () => T;
  task?: string;
  model?: ChatModelConfig;
  fallback?: ChatModelConfig;
};

type VisionContent = OpenAI.Chat.Completions.ChatCompletionContentPart[];

function shouldUseMock(task: string, reason: string): boolean {
  if (features.llmMock) {
    log.warn("mock fallback (LLM_ALLOW_MOCK=1)", { task, reason });
    return true;
  }
  return false;
}

function failOrMock<T>(task: string, reason: string, mock: () => T): T {
  if (shouldUseMock(task, reason)) return mock();
  if (reason.includes("not configured")) throw new LLMNotConfiguredError();
  throw new LLMGenerationError(task, reason);
}

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
 * DeepSeek-specific body fields (e.g. `thinking`). The Node SDK has no
 * `extra_body` like the Python SDK — unknown params must be spread directly
 * into the request params, which the SDK passes through to the JSON body.
 */
function chatExtraBody(config: ChatModelConfig): Record<string, unknown> {
  if (config.provider !== "deepseek" || !config.thinking) return {};
  return { thinking: config.thinking };
}

async function chatCompletion(args: {
  config: ChatModelConfig;
  task: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  json?: boolean;
}): Promise<{ content: string; usage: OpenAI.Completions.CompletionUsage | undefined }> {
  const client = getProviderClient(args.config.provider);
  if (!client) throw new LLMNotConfiguredError();

  const res = await client.chat.completions.create({
    model: args.config.model,
    messages: args.messages,
    ...(args.json ? { response_format: { type: "json_object" as const } } : {}),
    ...chatExtraBody(args.config),
  });

  const usage = res.usage;
  recordLlmUsage({
    task: args.task,
    provider: args.config.provider,
    model: args.config.model,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  });

  return {
    content: res.choices[0]?.message?.content ?? "",
    usage,
  };
}

async function runJsonCompletion<T>(args: {
  config: ChatModelConfig;
  task: string;
  system: string;
  prompt: string;
  schema: z.ZodTypeAny;
  maxAttempts: number;
}): Promise<{ data: T } | { error: string }> {
  let lastError = "";

  for (let attempt = 0; attempt < args.maxAttempts; attempt++) {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: args.system },
      { role: "user", content: args.prompt },
    ];
    if (attempt > 0) {
      messages.push({
        role: "user",
        content: `Your previous reply was invalid (${lastError}). Reply again with ONLY valid JSON matching the requested shape.`,
      });
    }

    try {
      const { content } = await chatCompletion({
        config: args.config,
        task: args.task,
        messages,
        json: true,
      });

      const raw = content || "{}";
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        lastError = "not parseable JSON";
        continue;
      }
      const parsed = args.schema.safeParse(json);
      if (parsed.success) return { data: parsed.data as T };
      lastError = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (err) {
      if (isRetryableLlmError(err) && attempt < args.maxAttempts - 1) {
        lastError = (err as Error).message;
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  return { error: lastError };
}

async function runStructuredCompletion<T>(args: {
  config: ChatModelConfig;
  task: string;
  system: string;
  prompt: string;
  schema: z.ZodTypeAny;
  maxAttempts: number;
}): Promise<{ data: T } | { error: string }> {
  if (strictToolsEnabled(args.config)) {
    const strict = await runStrictToolCompletion<T>({
      config: args.config,
      task: args.task,
      system: args.system,
      prompt: args.prompt,
      schema: args.schema,
    });
    if ("data" in strict) return strict;
    if (!strict.schemaRejected) {
      log.warn("strict tool call failed", { task: args.task, error: strict.error });
      return runJsonCompletion<T>({ ...args, maxAttempts: Math.min(2, args.maxAttempts) });
    }
    log.info("strict schema rejected by API, falling back to json_object", { task: args.task });
  }

  return runJsonCompletion<T>(args);
}

function hasJsonLlm(): boolean {
  const cfg = modelMapping.llmJSON;
  return isChatProviderConfigured(cfg) || isChatProviderConfigured(planCourseFallback);
}

/**
 * Structured JSON generation — DeepSeek V4 Flash by default.
 * Never silently mocks unless LLM_ALLOW_MOCK=1.
 */
export async function llmJSON<T>({
  system,
  prompt,
  schema,
  mock,
  task = "llmJSON",
  model,
  fallback,
}: LLMArgs<T>): Promise<T> {
  if (!hasJsonLlm()) {
    return failOrMock(task, "LLM not configured — set DEEPSEEK_API_KEY", mock);
  }

  const primary = resolveChatConfig(modelMapping.llmJSON, model);
  let result = await runStructuredCompletion<T>({
    config: primary,
    task,
    system,
    prompt,
    schema,
    maxAttempts: 3,
  });

  if ("error" in result && fallback && isChatProviderConfigured(fallback)) {
    result = await runStructuredCompletion<T>({
      config: fallback,
      task: `${task}:fallback`,
      system,
      prompt,
      schema,
      maxAttempts: 2,
    });
  }

  if ("data" in result) return result.data;

  return failOrMock(task, `invalid JSON after retries — ${result.error}`, mock);
}

/**
 * Vision JSON — GLM 4.6V FlashX by default; OpenAI gpt-4o-mini fallback.
 */
export async function llmVisionJSON<T>({
  system,
  content,
  schema,
  mock,
  task = "llmVisionJSON",
}: {
  system: string;
  content: VisionContent;
  schema: z.ZodTypeAny;
  mock: () => T;
  task?: string;
}): Promise<T> {
  const config = resolveVisionConfig();
  if (!isChatProviderConfigured(config)) {
    return failOrMock(
      task,
      "Vision LLM not configured — set ZAI_API_KEY or OPENAI_API_KEY",
      mock
    );
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
      const { content: rawContent } = await chatCompletion({
        config,
        task,
        messages,
        json: true,
      });

      const raw = rawContent || "{}";
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
      if (shouldUseMock(task, (err as Error).message)) return mock();
      throw err;
    }
  }

  return failOrMock(task, `invalid JSON after retries — ${lastError}`, mock);
}

/**
 * Free-form text — DeepSeek V4 Flash by default.
 */
export async function llmText({
  system,
  prompt,
  mock,
  task = "llmText",
  model,
}: {
  system: string;
  prompt: string;
  mock: () => string;
  task?: string;
  model?: ChatModelConfig;
}): Promise<string> {
  const config = resolveChatConfig(modelMapping.llmText, model);
  if (!isChatProviderConfigured(config)) {
    return failOrMock(task, "LLM not configured — set DEEPSEEK_API_KEY", mock);
  }

  try {
    const { content } = await chatCompletion({
      config,
      task,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const text = content.trim();
    if (!text) {
      return failOrMock(task, "empty response from model", mock);
    }
    return text;
  } catch (err) {
    if (shouldUseMock(task, (err as Error).message)) return mock();
    throw err;
  }
}

export { planCourseFallback };
