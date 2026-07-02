import { AsyncLocalStorage } from "node:async_hooks";
import { createLogger } from "@/lib/logger";
import type { LlmProvider } from "./models";

const costLog = createLogger("llm-cost");

export type LlmUsageRecord = {
  at: string;
  task: string;
  provider: LlmProvider | "openai-image";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type LlmCostSummary = {
  totalUsd: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  byTask: Record<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>;
  byModel: Record<string, { calls: number; costUsd: number }>;
  records: LlmUsageRecord[];
};

/** USD per 1M tokens — update when provider pricing changes. */
const CHAT_RATES_USD_PER_1M: Record<string, { input: number; output: number }> = {
  "deepseek-v4-flash": { input: 0.14, output: 0.28 },
  "deepseek-v4-pro": { input: 0.55, output: 2.19 },
  "glm-4.6v-flashx": { input: 0.1, output: 0.1 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

/** Flat per-image cost estimates (USD). */
const IMAGE_RATES_USD: Record<string, number> = {
  "gpt-image-1": 0.011,
  "gpt-image-2": 0.011,
  "dall-e-3": 0.04,
  "dall-e-2": 0.02,
};

export function estimateChatCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = CHAT_RATES_USD_PER_1M[model] ?? { input: 0.5, output: 1.5 };
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export function estimateImageCostUsd(model: string): number {
  return IMAGE_RATES_USD[model] ?? 0.02;
}

type CostContext = {
  jobId?: string;
  courseId?: string;
  records: LlmUsageRecord[];
};

const storage = new AsyncLocalStorage<CostContext>();

export function runWithLlmCostContext<T>(
  meta: { jobId?: string; courseId?: string },
  fn: () => Promise<T>
): Promise<T> {
  return storage.run({ ...meta, records: [] }, fn);
}

export function recordLlmUsage(args: {
  task: string;
  provider: LlmProvider | "openai-image";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
}) {
  const inputTokens = args.inputTokens ?? 0;
  const outputTokens = args.outputTokens ?? 0;
  const costUsd =
    args.imageCount != null && args.imageCount > 0
      ? estimateImageCostUsd(args.model) * args.imageCount
      : estimateChatCostUsd(args.model, inputTokens, outputTokens);

  const record: LlmUsageRecord = {
    at: new Date().toISOString(),
    task: args.task,
    provider: args.provider,
    model: args.model,
    inputTokens,
    outputTokens,
    costUsd,
  };

  const ctx = storage.getStore();
  if (ctx) ctx.records.push(record);

  if (process.env.LLM_COST_LOG !== "0") {
    costLog.info("inference", {
      task: record.task,
      provider: record.provider,
      model: record.model,
      inputTokens,
      outputTokens,
      costUsd: record.costUsd,
    });
  }
}

export function getLlmCostSummary(): LlmCostSummary {
  const records = storage.getStore()?.records ?? [];
  const byTask: LlmCostSummary["byTask"] = {};
  const byModel: LlmCostSummary["byModel"] = {};

  let totalUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const r of records) {
    totalUsd += r.costUsd;
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;

    byTask[r.task] ??= { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
    byTask[r.task].calls += 1;
    byTask[r.task].costUsd += r.costUsd;
    byTask[r.task].inputTokens += r.inputTokens;
    byTask[r.task].outputTokens += r.outputTokens;

    const modelKey = `${r.provider}/${r.model}`;
    byModel[modelKey] ??= { calls: 0, costUsd: 0 };
    byModel[modelKey].calls += 1;
    byModel[modelKey].costUsd += r.costUsd;
  }

  return {
    totalUsd: Math.round(totalUsd * 1_000_000) / 1_000_000,
    inputTokens,
    outputTokens,
    calls: records.length,
    byTask,
    byModel,
    records,
  };
}
