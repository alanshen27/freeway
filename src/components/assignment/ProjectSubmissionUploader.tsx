"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssignmentSubmissionFile } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectSubmissionUploader({
  assignmentId,
  initialFiles,
  heading = "Project submission",
  description = "PDF, documents, archives, images, code, or other deliverables for your project.",
}: {
  assignmentId: string;
  initialFiles: AssignmentSubmissionFile[];
  heading?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(selected: FileList | null) {
    const file = selected?.[0];
    if (!file || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/assignments/${assignmentId}/submission`, {
        method: "POST",
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Upload failed");
        return;
      }
      if (json.file) setFiles((prev) => [...prev, json.file as AssignmentSubmissionFile]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(fileId: string) {
    if (removingId) return;
    setError(null);
    setRemovingId(fileId);
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/submission?fileId=${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Remove failed");
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      setError("Remove failed");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
        <span className="text-xs text-muted-foreground">Up to 10 files · 25 MB each</span>
      </div>

      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-secondary/20 p-4",
          uploading && "opacity-70"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          disabled={uploading || files.length >= 10}
          onChange={(e) => upload(e.target.files)}
        />
        <Button
          type="button"
          variant="duoOutline"
          size="sm"
          disabled={uploading || files.length >= 10}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileUp className="size-4" />
          )}
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-medium text-primary hover:underline"
                >
                  {file.name}
                </a>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                className="action-danger flex size-8 shrink-0 items-center justify-center rounded-md"
                disabled={removingId === file.id}
                aria-label={`Remove ${file.name}`}
                onClick={() => remove(file.id)}
              >
                {removingId === file.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
