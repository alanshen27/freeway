"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RedoSectionButton({
  sectionId,
  size = "sm",
}: {
  sectionId: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function redo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await fetch(`/api/sections/${sectionId}/complete`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className="h-8 text-xs text-muted-foreground"
      disabled={busy}
      onClick={redo}
    >
      <RotateCcw className={`mr-1 size-3.5 ${busy ? "animate-spin" : ""}`} />
      Redo
    </Button>
  );
}

export function RedoLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function redo() {
    setBusy(true);
    try {
      await fetch(`/api/lessons/${lessonId}/reset`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="duoOutline"
      size="sm"
      disabled={busy}
      onClick={redo}
    >
      <RotateCcw className={`mr-1 size-3.5 ${busy ? "animate-spin" : ""}`} />
      Redo lesson
    </Button>
  );
}
