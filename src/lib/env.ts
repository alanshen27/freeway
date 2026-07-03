// Centralized feature flags derived from env. Everything degrades gracefully
// so the MVP runs end-to-end without external services.

function trimEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

export const env = {
  openaiKey: trimEnv(process.env.OPENAI_API_KEY),
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
  deepseekKey: trimEnv(process.env.DEEPSEEK_API_KEY),
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  /** Z.AI (z.ai) — GLM vision; also accepts legacy ZHIPUAI_API_KEY. */
  zaiKey: trimEnv(process.env.ZAI_API_KEY || process.env.ZHIPUAI_API_KEY),
  zaiBaseUrl:
    process.env.ZAI_BASE_URL ||
    process.env.ZHIPUAI_BASE_URL ||
    "https://api.z.ai/api/paas/v4",
  redisUrl: process.env.REDIS_URL || "",
  serpKey: process.env.SERPAPI_KEY || "",
  manimEnabled: process.env.MANIM_ENABLED === "1",
  manimBin: process.env.MANIM_BIN || "manim",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseVideoBucket: process.env.SUPABASE_VIDEO_BUCKET || "videos",
  elevenlabsKey: process.env.ELEVENLABS_API_KEY || "",
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
  elevenlabsModel: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
};

export const isProd = process.env.NODE_ENV === "production";

const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnon);

export const features = {
  /** Structured + text generation (DeepSeek). */
  llm: Boolean(env.deepseekKey),
  /** Vision QA (ZAI GLM, or OpenAI fallback). */
  visionLlm: Boolean(env.zaiKey || env.openaiKey),
  /** Generate images with OpenAI (gpt-image-1). */
  imageGen: Boolean(env.openaiKey),
  /** Use BullMQ + Redis vs inline pipeline execution. */
  queue: Boolean(env.redisUrl),
  /** Use SERP image search when OpenAI image gen fails. */
  serp: Boolean(env.serpKey),
  /** Render real Manim videos vs themed animated scenes. */
  manim: env.manimEnabled,
  /** Use Supabase auth (real login). */
  supabase: supabaseConfigured,
  /**
   * Cookie-based demo session (no password). Allowed ONLY in dev when Supabase
   * isn't configured — in production missing creds is treated as a config error.
   */
  demoSession: !supabaseConfigured && !isProd,
  /**
   * True when running in production without Supabase configured. The auth screen
   * surfaces a clear "auth not configured" message instead of a demo fallback.
   */
  authMisconfigured: !supabaseConfigured && isProd,
  /** Upload generated videos to Supabase Storage vs local /public. */
  supabaseStorage: Boolean(env.supabaseUrl && env.supabaseServiceRole),
  /** ElevenLabs text-to-speech for video voiceovers. */
  elevenlabs: Boolean(env.elevenlabsKey),
  /**
   * Allow mock LLM when keys missing or calls fail. OFF by default.
   * Set LLM_ALLOW_MOCK=1 only for prisma seed / offline demos — never in worker/prod.
   */
  llmMock: process.env.LLM_ALLOW_MOCK === "1",
};
