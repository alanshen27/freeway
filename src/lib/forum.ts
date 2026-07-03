import { prisma } from "@/lib/prisma";
import { llmText } from "@/lib/llm";
import { CAREERS } from "@/lib/catalog";

/** Stable forum key for a career track (e.g. "introduction-to-physics"). */
export function inferTrackSlug(title: string): string {
  const career = CAREERS.find((c) => c.title === title);
  if (career) return career.slug;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function trackTitle(trackSlug: string): string {
  return CAREERS.find((c) => c.slug === trackSlug)?.title ?? trackSlug;
}

/** User can participate if they have any course on this track. */
export async function userHasForumAccess(
  userId: string,
  trackSlug: string
): Promise<boolean> {
  const count = await prisma.course.count({
    where: { ownerId: userId, trackSlug },
  });
  return count > 0;
}

/** Resolve the viewer's course id for links within a shared track forum. */
export async function viewerCourseIdForTrack(
  userId: string,
  trackSlug: string,
  preferredCourseId?: string
): Promise<string | null> {
  if (preferredCourseId) {
    const preferred = await prisma.course.findFirst({
      where: { id: preferredCourseId, ownerId: userId, trackSlug },
      select: { id: true },
    });
    if (preferred) return preferred.id;
  }
  const course = await prisma.course.findFirst({
    where: { ownerId: userId, trackSlug },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return course?.id ?? null;
}

type ForumAuthor = { id: string; name: string };

type ForumPostForLlm = {
  id: string;
  body: string;
  isAI: boolean;
  author: ForumAuthor;
};

type ForumThreadForLlm = {
  title: string;
  body: string;
  author: ForumAuthor;
};

/** Serialize a forum thread + replies for LLM context with named participants. */
export function formatForumDiscussionForLlm(args: {
  thread: ForumThreadForLlm;
  posts: ForumPostForLlm[];
  asker: ForumAuthor;
}): string {
  const { thread, posts, asker } = args;

  const participantLabels = new Map<string, string>();
  participantLabels.set(thread.author.id, `${thread.author.name} (thread author)`);
  for (const post of posts) {
    if (!participantLabels.has(post.author.id)) {
      participantLabels.set(post.author.id, post.author.name);
    }
  }
  participantLabels.set(asker.id, `${asker.name} (asking now)`);

  const participants = [...participantLabels.values()];

  const lines: string[] = [
    "Participants:",
    ...participants.map((p) => `- ${p}`),
    "",
    "Discussion (chronological):",
    "",
    `[Thread — ${participantLabels.get(thread.author.id)}]`,
    `Title: ${thread.title}`,
    thread.body,
    "",
  ];

  for (const post of posts) {
    const owner = participantLabels.get(post.author.id) ?? post.author.name;
    const header = post.isAI
      ? `[AI tutor — assistant for ${owner}]`
      : `[Reply — ${owner}]`;
    lines.push(header, post.body, "");
  }

  return lines.join("\n").trim();
}

/** Serialize a private AI tutor sub-thread for follow-up replies. */
export function formatForumAiSubThreadForLlm(args: {
  promptPost: ForumPostForLlm;
  initialAiReply: ForumPostForLlm;
  subThread: ForumPostForLlm[];
  asker: ForumAuthor;
}): string {
  const { promptPost, initialAiReply, subThread, asker } = args;

  const lines: string[] = [
    `Learner: ${asker.name} (continuing private tutoring)`,
    "",
    "Original question:",
    promptPost.body,
    "",
    "Initial tutor response:",
    initialAiReply.body,
    "",
    "Private follow-up (chronological):",
    "",
  ];

  for (const post of subThread) {
    const header = post.isAI
      ? "[AI tutor]"
      : `[${post.author.name}]`;
    lines.push(header, post.body, "");
  }

  return lines.join("\n").trim();
}

type ForumExerciseForLlm = { title: string; prompt: string };

/** Generate an AI tutor reply for a forum thread. */
export async function generateForumTutorReply(args: {
  thread: ForumThreadForLlm;
  posts: ForumPostForLlm[];
  asker: ForumAuthor;
  exercise?: ForumExerciseForLlm | null;
  /** Omit a post (e.g. stale AI reply when regenerating). */
  excludePostId?: string;
}): Promise<string> {
  const posts = args.excludePostId
    ? args.posts.filter((p) => p.id !== args.excludePostId)
    : args.posts;

  const discussion = formatForumDiscussionForLlm({
    thread: args.thread,
    posts,
    asker: args.asker,
  });

  return llmText({
    task: "forumTutor",
    system:
      "You are a friendly, Socratic engineering tutor in a course forum. You see the " +
      "full discussion with each participant named; AI tutor replies note which learner " +
      "invoked the assistant. Give a concise, encouraging hint — guide, don't just hand " +
      "over the answer. Address the learner marked (asking now). Reference the exercise " +
      "if provided and build on prior replies without repeating yourself.",
    prompt: `${discussion}\n${
      args.exercise
        ? `\nLinked exercise: ${args.exercise.title} — ${args.exercise.prompt}`
        : ""
    }`,
    mock: () =>
      "Great question! Start by restating what the exercise is asking in your own words, then identify the one quantity you don't yet know. What relationship connects what you have to what you need? Try that and share where you get stuck.",
  });
}

/** Generate a follow-up AI tutor reply in a private sub-thread. */
export async function generateForumTutorFollowUpReply(args: {
  thread: ForumThreadForLlm;
  publicPosts: ForumPostForLlm[];
  promptPost: ForumPostForLlm;
  initialAiReply: ForumPostForLlm;
  subThread: ForumPostForLlm[];
  asker: ForumAuthor;
  exercise?: ForumExerciseForLlm | null;
}): Promise<string> {
  const discussion = formatForumDiscussionForLlm({
    thread: args.thread,
    posts: args.publicPosts,
    asker: args.asker,
  });

  const subThread = formatForumAiSubThreadForLlm({
    promptPost: args.promptPost,
    initialAiReply: args.initialAiReply,
    subThread: args.subThread,
    asker: args.asker,
  });

  return llmText({
    task: "forumTutorFollowUp",
    system:
      "You are a friendly, Socratic engineering tutor continuing a private " +
      "conversation with a learner. You see the public forum context and the " +
      "full private exchange so far. Respond to the learner's latest message — " +
      "be concise, encouraging, and build on what you already discussed. Guide, " +
      "don't just hand over the answer.",
    prompt: `${discussion}\n\n--- Private tutoring session ---\n\n${subThread}${
      args.exercise
        ? `\n\nLinked exercise: ${args.exercise.title} — ${args.exercise.prompt}`
        : ""
    }`,
    mock: () =>
      "Good follow-up! You're on the right track. What happens if you substitute that expression into the equation we discussed earlier? Walk through the algebra step by step and tell me where it gets tricky.",
  });
}
