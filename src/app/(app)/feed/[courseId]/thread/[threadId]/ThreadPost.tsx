"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { ForumMarkdown } from "@/components/forum/ForumMarkdown";
import { MentionTextarea } from "@/components/forum/MentionTextarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo } from "@/lib/utils";
import type { ForumAuthorPublic } from "@/lib/forum-types";
import type { MentionCandidate } from "@/lib/mentions";

export function ThreadPost({
  courseId,
  thread,
  isAuthor,
  mentionables,
}: {
  courseId: string;
  thread: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    author: ForumAuthorPublic;
  };
  isAuthor: boolean;
  mentionables: MentionCandidate[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body);
  const [editedAt, setEditedAt] = useState(thread.editedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function startEdit() {
    setTitle(thread.title);
    setBody(thread.body);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/forum/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Failed to save");
        return;
      }
      setEditing(false);
      setEditedAt(new Date().toISOString());
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/threads/${thread.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/feed/${courseId}`);
        return;
      }
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserAvatar name={thread.author.name} avatarUrl={thread.author.avatarUrl} />
          <span className="text-sm font-medium">{thread.author.name}</span>
          <span className="text-xs text-muted-foreground">
            · {timeAgo(thread.createdAt)}
            {editedAt && !editing && " · edited"}
          </span>
        </div>
        {isAuthor && !editing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Edit discussion"
              onClick={startEdit}
              className="flex size-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-secondary hover:text-slate-700"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Delete discussion"
              onClick={() => setConfirmingDelete(true)}
              className="action-danger flex size-8 items-center justify-center rounded-md"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="Title"
          />
          <MentionTextarea
            value={body}
            onChange={setBody}
            mentionables={mentionables}
            className="min-h-24"
            placeholder="Write your post…"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving || !title.trim() || !body.trim()}
              onClick={save}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={cancelEdit}>
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <ForumMarkdown source={body} />
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this discussion?"
        description="This permanently deletes the discussion and all of its replies. This can't be undone."
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
