"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RegenerateCourseButton({
  courseId,
  disabled,
}: {
  courseId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (
      !confirm(
        "Regenerate this course? All lessons and progress will be replaced with freshly generated content."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.jobId) router.push(`/add/generating/${data.jobId}`);
      else router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="duoOutline"
      size="sm"
      disabled={disabled || busy}
      onClick={regenerate}
    >
      <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
      Regenerate
    </Button>
  );
}
