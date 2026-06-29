import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, features } from "./env";
import { uploadVideoToStorage } from "./supabase/storage";

const PUBLIC_DIR = path.join(process.cwd(), "public/generated/audio");

/**
 * Synthesize narration with ElevenLabs. Returns a public URL (Supabase or local).
 * Returns null when not configured — caller uses on-screen text only.
 */
export async function synthesizeSpeech(
  text: string,
  filename: string
): Promise<string | null> {
  if (!features.elevenlabs) return null;

  try {
    const voiceId = env.elevenlabsVoiceId;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.elevenlabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: env.elevenlabsModel,
        }),
      }
    );
    if (!res.ok) {
      console.warn("[elevenlabs] TTS failed:", res.status, await res.text());
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const uploaded = await uploadVideoToStorage(`${filename}.mp3`, buffer, "audio/mpeg");
    if (uploaded) return uploaded;

    await mkdir(PUBLIC_DIR, { recursive: true });
    const dest = path.join(PUBLIC_DIR, `${filename}.mp3`);
    await writeFile(dest, buffer);
    return `/generated/audio/${filename}.mp3`;
  } catch (err) {
    console.warn("[elevenlabs]", (err as Error).message);
    return null;
  }
}
