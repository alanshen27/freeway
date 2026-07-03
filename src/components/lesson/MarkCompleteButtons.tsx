"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function MarkLessonCompleteButton({
  lessonId,
  lessonTitle,
  sectionCount,
  incompleteCount,
}: {
  lessonId: string;
  lessonTitle: string;
  sectionCount: number;
  incompleteCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (incompleteCount === 0 || sectionCount === 0) return null;

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="duoOutline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 className="size-3.5" />
        Mark complete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="confirm"
        title="Mark lesson complete?"
        description={`This will mark all ${sectionCount} steps in “${lessonTitle}” as complete${
          incompleteCount < sectionCount
            ? ` (${incompleteCount} remaining)`
            : ""
        }. You can redo individual steps later if needed.`}
        confirmLabel="Mark complete"
        confirmBusyLabel="Marking…"
        busy={busy}
        onConfirm={confirm}
      />
    </>
  );
}

export function MarkSubjectCompleteButton({
  subjectId,
  subjectTitle,
  lessonCount,
  sectionCount,
  incompleteCount,
}: {
  subjectId: string;
  subjectTitle: string;
  lessonCount: number;
  sectionCount: number;
  incompleteCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (incompleteCount === 0 || sectionCount === 0) return null;

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="duoOutline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 className="size-3.5" />
        Mark module complete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="confirm"
        title="Mark module complete?"
        description={`This will mark all ${sectionCount} steps across ${lessonCount} lesson${
          lessonCount === 1 ? "" : "s"
        } in “${subjectTitle}” as complete${
          incompleteCount < sectionCount
            ? ` (${incompleteCount} remaining)`
            : ""
        }. You can redo lessons or steps later if needed.`}
        confirmLabel="Mark complete"
        confirmBusyLabel="Marking…"
        busy={busy}
        onConfirm={confirm}
      />
    </>
  );
}
