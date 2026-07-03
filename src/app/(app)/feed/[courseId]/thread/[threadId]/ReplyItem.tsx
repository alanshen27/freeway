"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ListRow } from "@/components/layout/Page";
import { timeAgo, initials } from "@/lib/utils";

export function ReplyItem({
  threadId,
  post,
  isAuthor,
}: {
  threadId: string;
  post: {
    id: string;
    body: string;
    isAI: boolean;
    createdAt: string;
    editedAt: string | null;
    author: { name: string };
  };
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = isAuthor && !post.isAI;
  const canDelete = isAuthor;

  function startEdit() {
    setBody(post.body);
    setError(null);
    setEditing(true);
  }

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
      setEditing(false);
      router.refresh();
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
        router.refresh();
        return;
      }
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <ListRow className="items-start">
      {post.isAI ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
          <Sparkles className="size-4" />
        </span>
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-medium">
          {initials(post.author.name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {post.isAI ? "AI Tutor" : post.author.name}
            </span>
            {post.isAI && <Badge variant="primary">AI</Badge>}
            <span className="text-xs text-muted-foreground">
              {timeAgo(post.createdAt)}
              {post.editedAt && !editing && " · edited"}
            </span>
          </div>
          {(canEdit || canDelete) && !editing && (
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  aria-label="Edit reply"
                  onClick={startEdit}
                  className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-secondary hover:text-slate-700"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  aria-label="Delete reply"
                  onClick={() => setConfirmingDelete(true)}
                  className="action-danger flex size-7 items-center justify-center rounded-md"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-20"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
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
            </div>
          </div>
        ) : (
          <div className="mt-1.5">
            <Markdown source={post.body} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this reply?"
        description="This can't be undone."
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ListRow>
  );
}
