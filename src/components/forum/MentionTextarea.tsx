"use client";

import { useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { formatMention, type MentionCandidate } from "@/lib/mentions";

/** Find an active "@query" right before the caret, if any (broken by whitespace/newline). */
function detectMentionQuery(text: string, caret: number) {
  const uptoCaret = text.slice(0, caret);
  const at = uptoCaret.lastIndexOf("@");
  if (at === -1) return null;
  const between = uptoCaret.slice(at + 1);
  if (between.length > 40 || /[\s\n]/.test(between)) return null;
  return { start: at, query: between };
}

export function MentionTextarea({
  value,
  onChange,
  mentionables,
  className,
  placeholder,
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  mentionables: MentionCandidate[];
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [queryStart, setQueryStart] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return mentionables.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, mentionables]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);
    const caret = e.target.selectionStart ?? next.length;
    const mention = detectMentionQuery(next, caret);
    if (mention && mentionables.length > 0) {
      setQuery(mention.query);
      setQueryStart(mention.start);
      setActiveIndex(0);
    } else {
      setQuery(null);
    }
  }

  function selectMention(m: MentionCandidate) {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, queryStart);
    const after = value.slice(caret);
    const inserted = `${formatMention(m)} `;
    onChange(`${before}${inserted}${after}`);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectMention(matches[activeIndex]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        className={className}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg">
          {matches.map((m, i) => (
            <button
              type="button"
              key={m.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectMention(m)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                i === activeIndex ? "bg-secondary" : "hover:bg-secondary/60"
              )}
            >
              <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs" />
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
