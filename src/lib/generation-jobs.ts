import { prisma } from "@/lib/prisma";
import { removeQueueJob } from "@/lib/queue";

export type JobLlmCostView = {
  totalUsd: number | null;
  calls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

/** Read llmCost blob saved on GenerationJob.result at end of pipeline. */
export function parseJobLlmCost(result: unknown): JobLlmCostView {
  const empty: JobLlmCostView = {
    totalUsd: null,
    calls: null,
    inputTokens: null,
    outputTokens: null,
  };
  if (!result || typeof result !== "object") return empty;
  const llmCost = (result as Record<string, unknown>).llmCost;
  if (!llmCost || typeof llmCost !== "object") return empty;
  const c = llmCost as Record<string, unknown>;
  return {
    totalUsd: typeof c.totalUsd === "number" ? c.totalUsd : null,
    calls: typeof c.calls === "number" ? c.calls : null,
    inputTokens: typeof c.inputTokens === "number" ? c.inputTokens : null,
    outputTokens: typeof c.outputTokens === "number" ? c.outputTokens : null,
  };
}

export function jobDurationSec(
  createdAt: Date,
  updatedAt: Date,
  status: string
): number | null {
  if (status !== "COMPLETED" && status !== "FAILED") return null;
  const ms = updatedAt.getTime() - createdAt.getTime();
  return ms > 0 ? Math.round(ms / 1000) : null;
}

/** Delete a generation job from BullMQ and the database. */
export async function deleteGenerationJob(jobId: string) {
  await removeQueueJob(jobId);
  await prisma.generationJob.delete({ where: { id: jobId } });
}
