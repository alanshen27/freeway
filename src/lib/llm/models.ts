export type LlmProvider = "deepseek" | "zai" | "openai";

export type ChatModelConfig = {
  provider: LlmProvider;
  model: string;
  thinking?: { type: "disabled" | "enabled" };
};

export type ImageModelConfig = {
  provider: "openai";
  model: string;
  size: "1024x1024";
};

/** Default model routing for each LLM entry point. */
export const modelMapping = {
  llmJSON: {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    thinking: { type: "disabled" },
  },
  llmVisionJSON: {
    provider: "zai",
    model: "glm-4.6v-flashx",
  },
  llmText: {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    thinking: { type: "disabled" },
  },
  generateImage: {
    provider: "openai",
    model: "gpt-image-1",
    size: "1024x1024",
  },
} as const satisfies {
  llmJSON: ChatModelConfig;
  llmVisionJSON: ChatModelConfig;
  llmText: ChatModelConfig;
  generateImage: ImageModelConfig;
};

/** OpenAI vision fallback when ZAI is not configured. */
export const visionOpenAiFallback: ChatModelConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
};

/** Stronger model for planCourse when flash fails schema validation. */
export const planCourseFallback: ChatModelConfig = {
  provider: "deepseek",
  model: "deepseek-v4-pro",
  thinking: { type: "disabled" },
};
