/**
 * Mentions are stored inline in message bodies using standard markdown link
 * syntax with a custom scheme: `@[Display Name](mention:userId)`. This means
 * they parse correctly with zero extra remark plugins — `Markdown` just
 * special-cases the `mention:` href to render a styled chip instead of a link.
 */
const MENTION_REGEX = /@\[([^\]]+)\]\(mention:([a-zA-Z0-9_-]+)\)/g;

export type MentionCandidate = { id: string; name: string; avatarUrl?: string | null };

/** Build the inline mention token to insert into a composer's raw text. */
export function formatMention(candidate: MentionCandidate): string {
  return `@[${candidate.name}](mention:${candidate.id})`;
}

/** Strip the composer `@` so markdown emits one link; the chip adds `@` back in the UI. */
export function prepareMentionMarkdown(body: string): string {
  return body.replace(MENTION_REGEX, "[$1](mention:$2)");
}

export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_REGEX)) {
    ids.add(match[2]);
  }
  return [...ids];
}

/**
 * Resolve mentions in `body` against known candidates, excluding self-mentions
 * and any id that doesn't correspond to a real forum participant.
 */
export function resolveMentions(
  body: string,
  candidates: MentionCandidate[],
  authorId: string
): string[] {
  const validIds = new Set(candidates.map((c) => c.id));
  return extractMentionedUserIds(body).filter(
    (id) => id !== authorId && validIds.has(id)
  );
}
