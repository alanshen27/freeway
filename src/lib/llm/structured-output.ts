import type OpenAI from "openai";
import { z } from "zod";
import { features } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import type { ChatModelConfig } from "./models";
import { getDeepSeekBetaClient } from "./providers";
import { zodToStrictToolParameters } from "./strict-schema";
import { recordLlmUsage } from "./cost";

const log = createLogger("llm-structured");
const TOOL_NAME = "submit_result";

function isStrictSchemaRejected(err: unknown): boolean {
  const msg = (err as Error).message ?? String(err);
  return (
    msg.includes("json schema") ||
    msg.includes("JSON schema") ||
    msg.includes("strict") ||
    msg.includes("response_format") ||
    msg.includes("tool") ||
    msg.includes("deserialize")
  );
}

function chatExtraBody(config: ChatModelConfig): Record<string, unknown> | undefined {
  if (config.provider !== "deepseek" || !config.thinking) return undefined;
  return { thinking: config.thinking };
}

/**
 * DeepSeek beta strict tool call — schema enforced by the API, then Zod for min/max etc.
 */
export async function runStrictToolCompletion<T>(args: {
  config: ChatModelConfig;
  task: string;
  system: string;
  prompt: string;
  schema: z.ZodTypeAny;
}): Promise<{ data: T } | { error: string; schemaRejected?: boolean }> {
  const client = getDeepSeekBetaClient();
  if (!client) {
    return { error: "DeepSeek beta client not configured" };
  }

  let parameters: Record<string, unknown>;
  try {
    parameters = zodToStrictToolParameters(args.schema);
  } catch (err) {
    log.warn("failed to build strict tool schema", { task: args.task }, err);
    return { error: "local schema conversion failed", schemaRejected: true };
  }

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: TOOL_NAME,
        strict: true,
        description: "Submit the structured result for this task.",
        parameters: parameters as Record<string, unknown>,
      },
    },
  ];

  try {
    const extraBody = chatExtraBody(args.config);
    const res = await client.chat.completions.create({
      model: args.config.model,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.prompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: TOOL_NAME } },
      ...(extraBody ? { extra_body: extraBody } : {}),
    });

    const usage = res.usage;
    recordLlmUsage({
      task: `${args.task}:strictTool`,
      provider: args.config.provider,
      model: args.config.model,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
    });

    const toolCall = res.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.type !== "function") {
      return { error: "model did not return a tool call" };
    }

    let json: unknown;
    try {
      json = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      return { error: "tool arguments not valid JSON" };
    }

    const parsed = args.schema.safeParse(json);
    if (parsed.success) return { data: parsed.data as T };

    return {
      error: parsed.error.issues
        .slice(0, 4)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  } catch (err) {
    if (isStrictSchemaRejected(err)) {
      log.warn("strict tool call rejected by API", { task: args.task }, err);
      return { error: (err as Error).message, schemaRejected: true };
    }
    throw err;
  }
}

export function strictToolsEnabled(config: ChatModelConfig): boolean {
  return config.provider === "deepseek" && features.deepseekStrictTools;
}
