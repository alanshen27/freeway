// Centralized feature flags derived from env. Everything degrades gracefully
// so the MVP runs end-to-end without external services.

export const env = {
  openaiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
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
  /** Use real OpenAI vs deterministic mock generation. */
  llm: Boolean(env.openaiKey),
  /** Generate images with OpenAI DALL·E (same API key). */
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
};
