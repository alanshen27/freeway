"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, CheckCircle2 } from "lucide-react";
import { InlineMarkdown } from "@/components/Markdown";

type Question = {
  atSec: number;
  question: string;
  choices: string[];
  answerIndex: number;
};

type Props = {
  title: string;
  narration?: string | null;
  url?: string | null;
  audioUrl?: string | null;
  /** LLM-estimated duration — used to scale question timestamps to real audio length. */
  durationSec: number;
  questions?: Question[];
};

/**
 * Lesson video player. When voiceover is present, audio is the master clock and
 * the Manim video is stretched proportionally to finish with the narration.
 */
export function VideoPlayer({
  title,
  narration,
  url,
  audioUrl,
  durationSec,
  questions = [],
}: Props) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const masterDuration = Math.max(
    1,
    audioUrl ? (audioDuration ?? durationSec) : (videoDuration ?? durationSec)
  );

  /** Map question timestamps from LLM estimate to actual playback length. */
  const questionAt = useCallback(
    (atSec: number) => {
      if (!audioUrl || !audioDuration || durationSec <= 0) return atSec;
      return (atSec / durationSec) * audioDuration;
    },
    [audioUrl, audioDuration, durationSec]
  );

  const syncVideoToAudio = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a || !audioUrl) return;
    if (!Number.isFinite(v.duration) || !Number.isFinite(a.duration) || a.duration <= 0) {
      return;
    }
    const target = (a.currentTime / a.duration) * v.duration;
    if (Math.abs(v.currentTime - target) > 0.25) {
      v.currentTime = Math.min(target, v.duration - 0.05);
    }
  }, [audioUrl]);

  const applyPlaybackRate = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a || !audioUrl) return;
    if (v.duration > 0 && a.duration > 0) {
      v.playbackRate = Math.min(Math.max(v.duration / a.duration, 0.25), 4);
    }
  }, [audioUrl]);

  useEffect(() => {
    applyPlaybackRate();
  }, [applyPlaybackRate, audioDuration, videoDuration]);

  useEffect(() => {
    const q = questions.find(
      (qq, i) => !answered.has(i) && time >= questionAt(qq.atSec)
    );
    if (q && !active) {
      setActive(q);
      setPlaying(false);
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
  }, [time, questions, answered, active, questionAt]);

  if (!url) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
        <p className="font-medium">Video not available</p>
        <p className="mt-1 text-muted-foreground">
          {title} did not render. Install Manim on the worker (<code className="text-xs">pip install manim</code>)
          and regenerate this course.
        </p>
      </div>
    );
  }

  function syncMedia(play: boolean, fromStart = false) {
    const v = videoRef.current;
    const a = audioRef.current;

    if (fromStart) {
      if (v) v.currentTime = 0;
      if (a) a.currentTime = 0;
      setTime(0);
      applyPlaybackRate();
    }

    if (play) {
      if (audioUrl && a) {
        void a.play().then(() => {
          void v?.play();
        });
      } else {
        void v?.play();
      }
    } else {
      v?.pause();
      a?.pause();
    }
  }

  function toggle() {
    if (active) return;
    const next = !playing;
    syncMedia(next, !playing && time === 0);
    setPlaying(next);
  }

  function answer() {
    if (!active) return;
    const idx = questions.indexOf(active);
    setAnswered((s) => new Set(s).add(idx));
    setActive(null);
    setTimeout(() => {
      setPlaying(true);
      syncMedia(true);
    }, 250);
  }

  const pct = Math.min(100, (time / masterDuration) * 100);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-ink">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          src={url}
          className="h-full w-full"
          playsInline
          muted={!!audioUrl}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setVideoDuration(d);
          }}
          onTimeUpdate={(e) => {
            if (!audioUrl) setTime(e.currentTarget.currentTime);
          }}
          onEnded={() => {
            if (!audioUrl) setPlaying(false);
          }}
        />

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setAudioDuration(d);
            }}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              setTime(t);
              syncVideoToAudio();
            }}
            onEnded={() => {
              const v = videoRef.current;
              if (v && Number.isFinite(v.duration)) {
                v.currentTime = Math.max(0, v.duration - 0.05);
              }
              v?.pause();
              setPlaying(false);
            }}
          />
        )}

        {active && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center gap-3 bg-black/70 p-5 backdrop-blur-sm">
            <p className="text-sm font-medium text-white/90">Quick check</p>
            <div className="text-base font-semibold text-white">
              <InlineMarkdown source={active.question} parentheticalMath />
            </div>
            <div className="space-y-2">
              {active.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => answer()}
                  className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20"
                >
                  <InlineMarkdown source={c} parentheticalMath />
                </button>
              ))}
            </div>
          </div>
        )}

        {!playing && !active && (
          <button
            onClick={toggle}
            className="absolute inset-0 z-[5] flex items-center justify-center"
            aria-label="Play"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-white/95 shadow-lg">
              <Play className="ml-1 size-8 text-ink" fill="currentColor" />
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 bg-ink px-3 py-2">
        <button onClick={toggle} className="text-white" aria-label="Toggle play">
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-xs text-white/70">
          {fmt(time)} / {fmt(masterDuration)}
        </span>
        {questions.length > 0 && answered.size === questions.length && (
          <CheckCircle2 className="size-5 text-primary" />
        )}
      </div>
      {narration && (
        <div className="bg-ink-soft px-3 py-2 text-xs leading-relaxed text-white/70">
          <InlineMarkdown source={narration} />
        </div>
      )}
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}
