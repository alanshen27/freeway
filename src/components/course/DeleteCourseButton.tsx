"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

export function DeleteCourseButton({
  courseId,
  onDeleted,
  redirectTo = "/courses",
  className,
}: {
  courseId: string;
  /** Called after successful delete (e.g. remove card from list). */
  onDeleted?: () => void;
  /** Navigate here after delete; pass `null` to stay on the current page. */
  redirectTo?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) return;
      setOpen(false);
      onDeleted?.();
      router.refresh();
      if (redirectTo) router.push(redirectTo);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete course"
        onClick={() => setOpen(true)}
        className={cn(
          "action-danger flex size-8 items-center justify-center rounded-md",
          className
        )}
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this course?"
        description="All modules, lessons, assignments, and progress for this course will be permanently removed. This can't be undone."
        confirmLabel="Delete course"
        busy={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
