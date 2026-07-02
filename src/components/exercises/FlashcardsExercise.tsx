"use client";
import { useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Card = { front: string; back: string };
type Config = { cards: Card[] };

export function FlashcardsExercise({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (a: unknown) => void;
}) {
  const cfg = config as unknown as Config;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const total = cfg.cards.length;
  const finished = index >= total;
  const known = results.filter(Boolean).length;

  function mark(gotIt: boolean) {
    const next = [...results, gotIt];
    setResults(next);
    setFlipped(false);
    setIndex(index + 1);
    if (next.length === total) {
      onChange({ known: next.filter(Boolean).length, total });
    }
  }

  function restart() {
    setIndex(0);
    setResults([]);
    setFlipped(false);
    onChange(null);
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-border bg-slate-50/60 py-8 text-center">
        <p className="text-2xl font-semibold text-foreground">
          {known}/{total}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">cards known</p>
        <button
          type="button"
          onClick={restart}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <RotateCcw className="size-3.5" />
          Run the deck again
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Submit your answer below to record the result.
        </p>
      </div>
    );
  }

  const card = cfg.cards[index];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Card {index + 1} of {total}
        </span>
        <div className="flex gap-1">
          {cfg.cards.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-4 rounded-full",
                i < results.length
                  ? results[i]
                    ? "bg-mint"
                    : "bg-blush"
                  : i === index
                    ? "bg-primary"
                    : "bg-secondary"
              )}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="group relative block h-52 w-full [perspective:1000px]"
        aria-label={flipped ? "Show front" : "Reveal answer"}
      >
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-2xl border-2 px-6 text-center transition-transform duration-500 [backface-visibility:hidden] [transform-style:preserve-3d]",
            "border-border bg-white shadow-card",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          <span>
            <span className="block text-lg font-semibold text-foreground">
              {card.front}
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              Tap to reveal
            </span>
          </span>
        </span>
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-2xl border-2 border-primary bg-brand-50/60 px-6 text-center transition-transform duration-500 [backface-visibility:hidden] [transform:rotateY(-180deg)] [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(0deg)]"
          )}
        >
          <span className="text-base font-medium text-foreground">
            {card.back}
          </span>
        </span>
      </button>

      <div
        className={cn(
          "mt-4 grid grid-cols-2 gap-3 transition-opacity",
          !flipped && "pointer-events-none opacity-40"
        )}
      >
        <button
          type="button"
          onClick={() => mark(false)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blush/30 bg-blush-soft px-4 py-3 text-sm font-medium text-blush transition-colors hover:opacity-90"
        >
          <X className="size-4" />
          Still learning
        </button>
        <button
          type="button"
          onClick={() => mark(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mint/30 bg-mint-soft px-4 py-3 text-sm font-medium text-mint transition-colors hover:opacity-90"
        >
          <Check className="size-4" />
          Got it
        </button>
      </div>
    </div>
  );
}
