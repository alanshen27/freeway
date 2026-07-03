"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { MentionTextarea } from "@/components/forum/MentionTextarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentBlock } from "@/components/layout/Page";
import { cn } from "@/lib/utils";
import type { ForumAuthorPublic } from "@/lib/forum-types";
import type { MentionCandidate } from "@/lib/mentions";

export function ReplyBox({
  onSend,
  mentionables,
  author,
}: {
  onSend: (body: string, askAI: boolean) => void | Promise<void>;
  mentionables: MentionCandidate[];
  author: ForumAuthorPublic;
}) {
  const [body, setBody] = useState("");
  const [askAI, setAskAI] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = body.trim();
    if (!text) return;

    const wantAi = askAI;
    setBody("");
    setAskAI(false);
    setLoading(true);
    try {
      await onSend(text, wantAi);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ContentBlock className="mt-6">
      <div className="flex items-start gap-3">
        <UserAvatar name={author.name} avatarUrl={author.avatarUrl} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <label className="text-sm font-medium">Reply</label>
          <MentionTextarea
            value={body}
            onChange={setBody}
            mentionables={mentionables}
            placeholder="Write a reply or ask for a hint…"
            className="mt-1.5 min-h-20"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="ask-ai-tutor"
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                askAI
                  ? "border-primary/30 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              <Checkbox
                id="ask-ai-tutor"
                checked={askAI}
                onCheckedChange={(checked) => setAskAI(checked === true)}
              />
              Ask AI tutor
            </label>
            <Button size="sm" disabled={loading || !body.trim()} onClick={send}>
              <Send className="size-4" />
              {loading ? "Sending…" : "Reply"}
            </Button>
          </div>
        </div>
      </div>
    </ContentBlock>
  );
}
