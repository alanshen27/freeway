"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListPanel } from "@/components/layout/Page";
import { ThreadReply } from "./ThreadReply";
import { ReplyBox } from "./ReplyBox";
import type { AiThreadMessage } from "./AiTutorThread";

type PostShape = {
  id: string;
  body: string;
  isAI: boolean;
  createdAt: string;
  editedAt: string | null;
  author: { name: string };
};

type PromptPost = {
  id: string;
  isAuthor: boolean;
  post: PostShape;
  aiReply: PostShape | null;
  aiThread: AiThreadMessage[];
};

function toAiPostShape(aiPost: {
  id: string;
  body: string;
  createdAt: string | Date;
  editedAt?: string | Date | null;
}): PostShape {
  return {
    id: aiPost.id,
    body: aiPost.body,
    isAI: true,
    createdAt:
      typeof aiPost.createdAt === "string"
        ? aiPost.createdAt
        : aiPost.createdAt.toISOString(),
    editedAt: aiPost.editedAt
      ? typeof aiPost.editedAt === "string"
        ? aiPost.editedAt
        : aiPost.editedAt.toISOString()
      : null,
    author: { name: "AI Tutor" },
  };
}

export function ThreadDiscussion({
  threadId,
  posts: serverPosts,
  authorName,
}: {
  threadId: string;
  posts: PromptPost[];
  authorName: string;
}) {
  const router = useRouter();
  const [replies, setReplies] = useState(serverPosts);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(() => new Set());
  const tempToRealId = useRef<Map<string, string>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(false);
  const [scrollTick, setScrollTick] = useState(0);
  const bumpScroll = () => setScrollTick((t) => t + 1);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        stickToBottom.current = entry.isIntersecting;
      },
      { root: null, rootMargin: "0px 0px 96px 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [replies, generatingIds, scrollTick]);

  useEffect(() => {
    setReplies((current) => {
      const currentById = new Map(current.map((r) => [r.id, r]));
      const merged: PromptPost[] = serverPosts.map((sp) => {
        const local = currentById.get(sp.id);
        return {
          ...sp,
          aiReply: sp.aiReply ?? local?.aiReply ?? null,
          aiThread: sp.aiThread.length > 0 ? sp.aiThread : (local?.aiThread ?? []),
        };
      });

      for (const r of current) {
        if (!r.id.startsWith("temp-")) continue;
        const realId = tempToRealId.current.get(r.id);
        if (realId && serverPosts.some((s) => s.id === realId)) continue;
        if (!serverPosts.some((s) => s.id === r.id)) {
          merged.push(r);
        }
      }

      return merged;
    });
  }, [serverPosts]);

  function setGenerating(postId: string, on: boolean) {
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(postId);
      else next.delete(postId);
      return next;
    });
  }

  function applyAiReply(promptPostId: string, aiPost: PostShape) {
    setReplies((prev) =>
      prev.map((r) => (r.id === promptPostId ? { ...r, aiReply: aiPost } : r))
    );
  }

  async function sendReply(body: string, askAI: boolean) {
    stickToBottom.current = true;
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: PromptPost = {
      id: tempId,
      isAuthor: true,
      post: {
        id: tempId,
        body,
        isAI: false,
        createdAt: new Date().toISOString(),
        editedAt: null,
        author: { name: authorName },
      },
      aiReply: null,
      aiThread: [],
    };

    setReplies((prev) => [...prev, optimistic]);
    if (askAI) setGenerating(tempId, true);

    try {
      const res = await fetch(`/api/forum/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, askAI }),
      });
      if (!res.ok) {
        setReplies((prev) => prev.filter((r) => r.id !== tempId));
        setGenerating(tempId, false);
        return;
      }

      const json = await res.json();
      const postId = json.post?.id as string | undefined;
      if (!postId) {
        setReplies((prev) => prev.filter((r) => r.id !== tempId));
        setGenerating(tempId, false);
        return;
      }

      tempToRealId.current.set(tempId, postId);

      setReplies((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? { ...r, id: postId, post: { ...r.post, id: postId } }
            : r
        )
      );

      if (askAI) {
        setGenerating(tempId, false);
        setGenerating(postId, true);

        void (async () => {
          try {
            const aiRes = await fetch(
              `/api/forum/threads/${threadId}/posts/${postId}/generate-ai`,
              { method: "POST" }
            );
            if (aiRes.ok) {
              const { aiPost } = await aiRes.json();
              applyAiReply(postId, toAiPostShape(aiPost));
              router.refresh();
            }
          } finally {
            setGenerating(postId, false);
          }
        })();
      }

      router.refresh();
    } catch {
      setReplies((prev) => prev.filter((r) => r.id !== tempId));
      setGenerating(tempId, false);
    }
  }

  return (
    <>
      {replies.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Replies ({replies.length})
          </p>
          <ListPanel>
            {replies.map((p) => (
              <ThreadReply
                key={p.id}
                threadId={threadId}
                authorName={authorName}
                isAuthor={p.isAuthor}
                post={p.post}
                aiReply={p.aiReply}
                aiThread={p.aiThread}
                aiGenerating={generatingIds.has(p.id) && !p.aiReply}
                onRegenerateStart={() => setGenerating(p.id, true)}
                onRegenerateEnd={() => setGenerating(p.id, false)}
                onActivity={bumpScroll}
                onAiReplyUpdated={(aiReply) => {
                  applyAiReply(p.id, aiReply);
                  router.refresh();
                }}
              />
            ))}
          </ListPanel>
        </div>
      )}

      <ReplyBox onSend={sendReply} />
      <div ref={bottomRef} aria-hidden className="h-0" />
    </>
  );
}
