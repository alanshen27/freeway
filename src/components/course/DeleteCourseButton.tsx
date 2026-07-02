"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confirm state resets after a few seconds if not acted on.
  useEffect(() => {
    if (!confirming) return;
    timer.current = setTimeout(() => setConfirming(false), 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [confirming]);

  async function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/courses");
      router.refresh();
      return;
    }
    setBusy(false);
    setConfirming(false);
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      aria-label={confirming ? "Confirm delete course" : "Delete course"}
      className={cn(
        "flex h-8 items-center justify-center gap-1.5 rounded-md text-sm transition-colors disabled:opacity-50",
        confirming
          ? "bg-blush px-3 text-xs font-semibold text-white hover:opacity-90"
          : "w-8 text-muted-foreground hover:bg-blush-soft hover:text-blush"
      )}
    >
      <Trash2 className="size-4" />
      {confirming && (busy ? "Deleting…" : "Delete?")}
    </button>
  );
}
