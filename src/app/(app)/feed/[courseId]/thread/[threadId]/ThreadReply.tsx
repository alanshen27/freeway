"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { ForumMarkdown } from "@/components/forum/ForumMarkdown";
import { MentionTextarea } from "@/components/forum/MentionTextarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ListRow } from "@/components/layout/Page";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo, cn } from "@/lib/utils";
import type { ForumAuthorPublic } from "@/lib/forum-types";
import { AiTutorThread, type AiThreadMessage } from "./AiTutorThread";
import type { MentionCandidate } from "@/lib/mentions";

type PostShape = {
  id: string;
  body: string;
  isAI: boolean;
  createdAt: string;
  editedAt: string | null;
  author: ForumAuthorPublic;
};

export function ThreadReply({
  threadId,
  post,
  aiReply,
  aiThread = [],
  author,
  isAuthor,
  mentionables,
  aiGenerating = false,
  onRegenerateStart,
  onRegenerateEnd,
  onAiReplyUpdated,
  onActivity,
  onDeleted,
  onUpdated,
}: {
  threadId: string;
  post: PostShape;
  aiReply?: PostShape | null;
  aiThread?: AiThreadMessage[];
  author: ForumAuthorPublic;
  isAuthor: boolean;
  mentionables: MentionCandidate[];
  aiGenerating?: boolean;
  onRegenerateStart?: () => void;
  onRegenerateEnd?: () => void;
  onAiReplyUpdated?: (aiReply: PostShape) => void;
  onActivity?: () => void;
  onDeleted?: () => void;
  onUpdated?: (update: { body: string; editedAt: string | null }) => void;
}) {
  const promptRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(isAuthor);

  const promptLocked = aiGenerating || regenerating;
  const showAiGenerating = aiGenerating || regenerating;

  useEffect(() => {
    if (showAiGenerating && isAuthor) setAiExpanded(true);
  }, [showAiGenerating, isAuthor]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Failed to save");
        return;
      }
      const editedAt = new Date().toISOString();
      setEditing(false);
      onUpdated?.({ body: body.trim(), editedAt });
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/posts/${post.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted?.();
        return;
      }
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  async function regenerateAi() {
    if (!aiReply || regenerating || aiGenerating) return;
    setRegenerating(true);
    onRegenerateStart?.();
    setError(null);
    try {
      const res = await fetch(
        `/api/forum/threads/${threadId}/posts/${post.id}/regenerate-ai`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Regenerate failed");
        return;
      }
      const json = await res.json();
      if (json.aiPost) {
        const ai = json.aiPost;
        onAiReplyUpdated?.({
          id: ai.id,
          body: ai.body,
          isAI: true,
          createdAt: new Date(ai.createdAt).toISOString(),
          editedAt: ai.editedAt ? new Date(ai.editedAt).toISOString() : null,
          author: { name: "AI Tutor" },
        });
      }
    } catch {
      setError("Regenerate failed");
    } finally {
      setRegenerating(false);
      onRegenerateEnd?.();
    }
  }

  function startEditPrompt() {
    if (promptLocked) return;
    setBody(post.body);
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => {
      promptRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <div className="border-b border-border last:border-0">
      <ListRow className="items-start border-0">
        <UserAvatar name={post.author.name} avatarUrl={post.author.avatarUrl} />
        <div
          ref={promptRef}
          className={cn(
            "min-w-0 flex-1 transition-opacity",
            promptLocked && !editing && "opacity-50"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{post.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(post.createdAt)}
                {post.editedAt && !editing && " · edited"}
              </span>
            </div>
            {isAuthor && !editing && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Edit reply"
                  disabled={promptLocked}
                  onClick={startEditPrompt}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors",
                    promptLocked
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-secondary hover:text-slate-700"
                  )}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete reply"
                  disabled={promptLocked}
                  onClick={() => setConfirmingDelete(true)}
                  className={cn(
                    "action-danger flex size-7 items-center justify-center rounded-md",
                    promptLocked && "cursor-not-allowed opacity-40"
                  )}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-1.5 space-y-2">
              <MentionTextarea
                value={body}
                onChange={setBody}
                mentionables={mentionables}
                className="min-h-20"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !body.trim()}
                  onClick={save}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                {aiReply && (
                  <Button
                    type="button"
                    size="sm"
                    variant="duoOutline"
                    disabled={saving || regenerating || !body.trim()}
                    onClick={async () => {
                      setSaving(true);
                      setError(null);
                      try {
                        const res = await fetch(
                          `/api/forum/threads/${threadId}/posts/${post.id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ body: body.trim() }),
                          }
                        );
                        if (!res.ok) {
                          const json = await res.json().catch(() => ({}));
                          setError(
                            typeof json.error === "string" ? json.error : "Failed to save"
                          );
                          return;
                        }
                        setEditing(false);
                        await regenerateAi();
                      } catch {
                        setError("Failed to save");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Save &amp; regenerate AI
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-1.5">
              <ForumMarkdown source={post.body} />
            </div>
          )}
        </div>
      </ListRow>

      {(aiReply || showAiGenerating) && (
        <div className="border-t border-border px-4 py-4 sm:pl-14">
          <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-brand-50/80 via-brand-50/40 to-white shadow-sm ring-1 ring-primary/10">
            <button
              type="button"
              aria-expanded={aiExpanded}
              onClick={() => setAiExpanded((open) => !open)}
              className="flex w-full items-center gap-2 border-b border-primary/15 bg-primary/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-primary/[0.09]"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-white">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-800">AI Tutor</p>
                {!aiExpanded && (
                  <p className="text-[11px] text-brand-700/70">
                    {showAiGenerating
                      ? isAuthor
                        ? "Generating response…"
                        : "AI response in progress"
                      : "Tap to show response"}
                  </p>
                )}
              </div>
              {showAiGenerating && (
                <Loader2 className="size-4 shrink-0 animate-spin text-brand-600" />
              )}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-brand-700/70 transition-transform",
                  aiExpanded && "rotate-180"
                )}
              />
            </button>

            {aiExpanded && (
            <div className="px-3 py-3">
              <div className="flex gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-white">
                  <Sparkles className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  {showAiGenerating ? (
                    <>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        {regenerating ? "Regenerating…" : "Generating…"}
                      </span>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {regenerating
                          ? "Reworking the response…"
                          : "Thinking through your question…"}
                      </p>
                    </>
                  ) : (
                    aiReply && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(aiReply.createdAt)}
                          {aiReply.editedAt && " · regenerated"}
                        </span>
                        <div className="mt-1.5 rounded-lg border border-primary/10 bg-white/80 px-3 py-2 text-sm">
                          <ForumMarkdown source={aiReply.body} />
                        </div>
                      </>
                    )
                  )}
                </div>
              </div>

              {isAuthor && aiReply && !showAiGenerating && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="duoOutline"
                    disabled={regenerating || editing || aiGenerating}
                    onClick={regenerateAi}
                  >
                    {regenerating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={editing || aiGenerating}
                    onClick={startEditPrompt}
                  >
                    <Pencil className="size-4" />
                    Edit prompt
                  </Button>
                </div>
              )}

              {error && !editing && (
                <p className="mt-2 text-xs text-destructive">{error}</p>
              )}

              {aiReply && !showAiGenerating && isAuthor && (
                <div className="mt-3">
                  <AiTutorThread
                    threadId={threadId}
                    promptPostId={post.id}
                    author={author}
                    isAuthor
                    messages={aiThread}
                    onActivity={onActivity}
                  />
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={aiReply ? "Delete reply and AI tutoring?" : "Delete this reply?"}
        description={
          aiReply
            ? "Your message, the AI tutor response, and any private follow-up messages will all be removed."
            : "This can't be undone."
        }
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
