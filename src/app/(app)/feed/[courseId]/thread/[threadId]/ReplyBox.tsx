"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentBlock } from "@/components/layout/Page";
import { cn } from "@/lib/utils";

export function ReplyBox({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [askAI, setAskAI] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    const res = await fetch(`/api/forum/threads/${threadId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, askAI }),
    });
    if (res.ok) {
      setBody("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <ContentBlock className="mt-6">
      <label className="text-sm font-medium">Reply</label>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
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
    </ContentBlock>
  );
}
