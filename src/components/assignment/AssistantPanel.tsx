"use client";
import { useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import type { AssignmentChatMessage } from "@/lib/schemas";

export function AssistantPanel({
  assignmentId,
  initialMessages,
}: {
  assignmentId: string;
  initialMessages: AssignmentChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setLoading(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: message, at: new Date().toISOString() },
    ]);
    scrollToBottom();

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply, at: new Date().toISOString() },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Sorry — I couldn't respond just now. Try again in a moment.",
            at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Network error — try again in a moment.",
          at: new Date().toISOString(),
        },
      ]);
    }
    setLoading(false);
    scrollToBottom();
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border bg-slate-50/60 px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-white">
          <Sparkles className="size-3.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">AI assistant</h2>
          <p className="text-xs text-muted-foreground">
            Stuck? Ask for hints, structure, or feedback.
          </p>
        </div>
      </div>

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-80 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                m.role === "user"
                  ? "ml-auto bg-primary text-white"
                  : "bg-slate-100 text-foreground"
              )}
            >
              {m.role === "assistant" ? (
                <Markdown source={m.content} />
              ) : (
                m.content
              )}
            </div>
          ))}
          {loading && (
            <div className="max-w-[85%] rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask about this assignment…"
          className="max-h-32 min-h-10 flex-1 resize-y rounded-lg border-0 bg-slate-100/80 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </div>
    </section>
  );
}
