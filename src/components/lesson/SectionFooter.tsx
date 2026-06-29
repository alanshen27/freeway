"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SectionFooter({
  sectionId,
  lessonId,
  nextHref,
  completed,
  label = "Mark complete & continue",
}: {
  sectionId: string;
  lessonId: string;
  nextHref?: string;
  completed: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(completed);

  async function complete() {
    if (done || busy) {
      if (nextHref) router.push(nextHref);
      else router.push(`/lessons/${lessonId}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/sections/${sectionId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        setDone(true);
        if (nextHref) router.push(nextHref);
        else router.push(`/lessons/${lessonId}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function redo() {
    setBusy(true);
    try {
      await fetch(`/api/sections/${sectionId}/complete`, { method: "DELETE" });
      setDone(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
      {done ? (
        <span className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="size-4" />
          Completed
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Finish this step to continue</span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {done && (
          <Button type="button" variant="duoOutline" size="sm" disabled={busy} onClick={redo}>
            <RotateCcw className="mr-1 size-3.5" />
            Redo
          </Button>
        )}
        <Button onClick={complete} disabled={busy}>
          {done ? "Continue" : label}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </footer>
  );
}
