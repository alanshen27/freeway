import OpenAI from "openai";
import { env } from "@/lib/env";
import type { ChatModelConfig, LlmProvider } from "./models";
import { modelMapping, visionOpenAiFallback } from "./models";

const clients = new Map<LlmProvider, OpenAI>();

function createClient(provider: LlmProvider): OpenAI | null {
  switch (provider) {
    case "deepseek":
      if (!env.deepseekKey) return null;
      return new OpenAI({
        apiKey: env.deepseekKey,
        baseURL: env.deepseekBaseUrl,
        timeout: 120_000,
        maxRetries: 2,
      });
    case "zai":
      if (!env.zaiKey) return null;
      return new OpenAI({
        apiKey: env.zaiKey,
        baseURL: env.zaiBaseUrl,
        timeout: 120_000,
        maxRetries: 2,
        defaultHeaders: { "Accept-Language": "en-US,en" },
      });
    case "openai":
      if (!env.openaiKey) return null;
      return new OpenAI({
        apiKey: env.openaiKey,
        timeout: 120_000,
        maxRetries: 2,
      });
  }
}

export function getProviderClient(provider: LlmProvider): OpenAI | null {
  if (clients.has(provider)) return clients.get(provider) ?? null;
  const created = createClient(provider);
  if (created) clients.set(provider, created);
  return created;
}

export function resolveChatConfig(
  base: ChatModelConfig,
  override?: ChatModelConfig
): ChatModelConfig {
  return override ?? base;
}

/** Vision: prefer ZAI; fall back to OpenAI when ZAI key is missing. */
export function resolveVisionConfig(): ChatModelConfig {
  const preferred = modelMapping.llmVisionJSON;
  if (getProviderClient(preferred.provider)) return preferred;
  return visionOpenAiFallback;
}

export function isChatProviderConfigured(config: ChatModelConfig): boolean {
  return Boolean(getProviderClient(config.provider));
}
