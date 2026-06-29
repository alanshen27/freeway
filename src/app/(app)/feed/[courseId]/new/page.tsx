"use client";
import { Suspense, use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Page, ContentBlock } from "@/components/layout/Page";

function NewThread({ courseId }: { courseId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const exerciseId = params.get("exerciseId");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/forum/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title, body, exerciseId }),
    });
    const data = await res.json();
    if (data.thread) router.push(`/feed/${courseId}/thread/${data.thread.id}`);
    else setLoading(false);
  }

  return (
    <div>
      <PageHeader title="New discussion" />
      <Page>
        <ContentBlock>
          {exerciseId && (
            <Badge variant="primary" className="mb-4">
              <Paperclip className="size-3" /> Linked to an exercise
            </Badge>
          )}
          <label className="text-sm font-medium">Title</label>
          <Input
            className="mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you need help with?"
          />
          <label className="mt-4 block text-sm font-medium">Details</label>
          <Textarea
            className="mt-1.5 min-h-32"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe what you tried and where you got stuck…"
          />
          <Button
            className="mt-5"
            disabled={loading || title.trim().length < 2 || !body.trim()}
            onClick={submit}
          >
            {loading ? "Posting…" : "Post discussion"}
          </Button>
        </ContentBlock>
      </Page>
    </div>
  );
}

export default function NewThreadPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return (
    <Suspense fallback={null}>
      <NewThread courseId={courseId} />
    </Suspense>
  );
}
