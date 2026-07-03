"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { ForumMarkdown } from "@/components/forum/ForumMarkdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo, cn } from "@/lib/utils";
import type { ForumAuthorPublic } from "@/lib/forum-types";

export type AiThreadMessage = {
  id: string;
  body: string;
  isAI: boolean;
  createdAt: string;
  editedAt: string | null;
  author: ForumAuthorPublic;
};

function toMessage(post: {
  id: string;
  body: string;
  isAI: boolean;
  createdAt: string | Date;
  editedAt?: string | Date | null;
  author: ForumAuthorPublic;
}): AiThreadMessage {
  return {
    id: post.id,
    body: post.body,
    isAI: post.isAI,
    createdAt:
      typeof post.createdAt === "string"
        ? post.createdAt
        : post.createdAt.toISOString(),
    editedAt: post.editedAt
      ? typeof post.editedAt === "string"
        ? post.editedAt
        : post.editedAt.toISOString()
      : null,
    author: post.author,
  };
}

export function AiTutorThread({
  threadId,
  promptPostId,
  author,
  isAuthor,
  messages: serverMessages,
  onActivity,
}: {
  threadId: string;
  promptPostId: string;
  author: ForumAuthorPublic;
  isAuthor: boolean;
  messages: AiThreadMessage[];
  onActivity?: () => void;
}) {
  const [messages, setMessages] = useState(serverMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages((current) => {
      const serverIds = new Set(serverMessages.map((m) => m.id));
      const pending = current.filter((m) => m.id.startsWith("temp-") && !serverIds.has(m.id));
      return [...serverMessages, ...pending];
    });
  }, [serverMessages]);

  async function send() {
    const text = body.trim();
    if (!text || sending || generating) return;

    const tempHumanId = `temp-${crypto.randomUUID()}`;
    const optimisticHuman: AiThreadMessage = {
      id: tempHumanId,
      body: text,
      isAI: false,
      createdAt: new Date().toISOString(),
      editedAt: null,
      author,
    };

    setBody("");
    setError(null);
    setMessages((prev) => [...prev, optimisticHuman]);
    setSending(true);
    setGenerating(true);
    onActivity?.();

    try {
      const res = await fetch(
        `/api/forum/threads/${threadId}/posts/${promptPostId}/ai-thread`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Failed to send");
        setMessages((prev) => prev.filter((m) => m.id !== tempHumanId));
        return;
      }

      const { humanPost, aiPost } = await res.json();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempHumanId),
        toMessage(humanPost),
        toMessage({ ...aiPost, author: { name: "AI Tutor" } }),
      ]);
      onActivity?.();
    } catch {
      setError("Failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== tempHumanId));
    } finally {
      setSending(false);
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      {messages.length > 0 && (
        <ul className="space-y-2.5">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.isAI ? "items-start" : "items-start justify-end"
              )}
            >
              {msg.isAI && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-white">
                  <Sparkles className="size-3" />
                </span>
              )}
              <div
                className={cn(
                  "min-w-0 max-w-[92%] rounded-lg px-3 py-2 text-sm",
                  msg.isAI
                    ? "border border-primary/10 bg-white/80 text-foreground"
                    : "border border-border bg-white text-foreground shadow-sm"
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium">
                    {msg.isAI ? "AI Tutor" : msg.author.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <ForumMarkdown source={msg.body} />
              </div>
              {!msg.isAI && (
                <UserAvatar
                  name={msg.author.name}
                  avatarUrl={msg.author.avatarUrl}
                  size="xs"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {generating && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          AI tutor is thinking…
        </p>
      )}

      {isAuthor && (
        <div className="border-t border-primary/10 pt-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ask a follow-up…"
            className="min-h-16 bg-white/80 text-sm"
            disabled={sending || generating}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              disabled={sending || generating || !body.trim()}
              onClick={send}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {sending ? "Sending…" : "Reply to tutor"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
