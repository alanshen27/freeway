import { Markdown } from "@/components/Markdown";

/** Forum message markdown — @mentions render as accent badges. */
export function ForumMarkdown({ source }: { source: string }) {
  return <Markdown source={source} mentionBadges />;
}
