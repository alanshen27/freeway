"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompleteButton({
  assignmentId,
  completed,
}: {
  assignmentId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        completed
          ? "bg-secondary text-foreground hover:bg-secondary/70"
          : "bg-primary text-white hover:bg-primary/90"
      )}
    >
      {completed ? (
        <>
          <Undo2 className="size-4" />
          Mark incomplete
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4" />
          Mark complete
        </>
      )}
    </button>
  );
}
