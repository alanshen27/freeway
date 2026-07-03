"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

export function DeleteThreadButton({
  threadId,
  onDeleted,
  redirectTo = null,
  className,
}: {
  threadId: string;
  onDeleted?: () => void;
  /** Navigate here after delete; defaults to staying on the current page. */
  redirectTo?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, { method: "DELETE" });
      if (!res.ok) return;
      setOpen(false);
      onDeleted?.();
      if (redirectTo) {
        router.push(redirectTo);
      } else if (!onDeleted) {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete discussion"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "action-danger flex size-8 shrink-0 items-center justify-center rounded-md",
          className
        )}
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this discussion?"
        description="This permanently deletes the discussion and all of its replies. This can't be undone."
        busy={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
