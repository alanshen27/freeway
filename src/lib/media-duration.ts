/** Estimate MP3 duration by scanning MPEG audio frame headers. */
function mp3DurationFromBuffer(buffer: Buffer): number {
  let offset = 0;
  // Skip ID3v2 tag if present.
  if (buffer.length >= 10 && buffer.toString("utf8", 0, 3) === "ID3") {
    const size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + size;
  }

  const bitrates = [
    [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  ];
  const sampleRates = [
    [44100, 48000, 32000],
    [22050, 24000, 16000],
    [11025, 12000, 8000],
  ];

  let frames = 0;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset++;
      continue;
    }
    const version = (buffer[offset + 1] >> 3) & 0x03;
    const layer = (buffer[offset + 1] >> 1) & 0x03;
    const bitrateIdx = (buffer[offset + 2] >> 4) & 0x0f;
    const sampleIdx = (buffer[offset + 2] >> 2) & 0x03;
    const padding = (buffer[offset + 2] >> 1) & 0x01;

    if (layer !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || sampleIdx === 3) {
      offset++;
      continue;
    }

    const bitrateRow = version === 3 ? 0 : version === 2 ? 1 : 2;
    const sampleRow = version === 3 ? 0 : version === 2 ? 1 : 2;
    const bitrate = bitrates[bitrateRow][bitrateIdx] * 1000;
    const sampleRate = sampleRates[sampleRow][sampleIdx];
    if (!bitrate || !sampleRate) {
      offset++;
      continue;
    }

    const frameLen =
      version === 3
        ? Math.floor((144 * bitrate) / sampleRate) + padding
        : Math.floor((72 * bitrate) / sampleRate) + padding;

    if (frameLen < 4) {
      offset++;
      continue;
    }

    frames++;
    offset += frameLen;
  }

  return frames > 0 ? (frames * 1152) / 44100 : 0;
}

/** Resolve real voiceover length for question timing (seconds). */
export async function probeMediaDuration(
  audioUrl: string | null,
  narration: string,
  fallbackSec: number
): Promise<number> {
  if (audioUrl) {
    try {
      const res = await fetch(audioUrl, { signal: AbortSignal.timeout(20_000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const sec = mp3DurationFromBuffer(buf);
        if (sec >= 5) return sec;
      }
    } catch {
      /* fall through */
    }
  }

  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  if (words > 0) return Math.max(15, Math.round(words / 2.4));

  return fallbackSec;
}
