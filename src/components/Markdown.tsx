import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { convertParentheticalMath } from "@/lib/markdown-math";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-5 text-lg font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 text-base font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ node, children }) => {
    // Markdown images are inline, so `![alt](url)` on its own line still
    // parses as a <p> wrapping an <img>. Our img renderer below outputs a
    // block-level <figure>, and <figure> can't legally sit inside <p> — that
    // mismatch between server/client-parsed HTML is what triggers hydration
    // errors. Skip the <p> wrapper whenever the paragraph contains an image.
    const hasImage = node?.children?.some(
      (child) => child.type === "element" && child.tagName === "img"
    );
    if (hasImage) return <>{children}</>;
    return <p className="my-2 text-sm leading-relaxed text-foreground">{children}</p>;
  },
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-primary/40 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  pre: ({ children }) => (
    <pre className="hljs-code my-4 overflow-hidden rounded-lg border border-slate-700/50">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    if (className?.includes("hljs")) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  img: ({ src, alt, title }) => {
    const url = typeof src === "string" ? src : undefined;
    if (!url || url.startsWith("IMAGE_")) return null;
    return (
      <figure className="my-4 overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt ?? ""} className="aspect-video w-full object-cover" />
        {(title ?? alt) && (
          <figcaption className="px-2 py-1 text-xs text-muted-foreground">
            {title ?? alt}
          </figcaption>
        )}
      </figure>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border bg-secondary/60 px-3 py-2 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-2">{children}</td>
  ),
};

export function Markdown({
  source,
  parentheticalMath = false,
}: {
  source: string;
  /** Also convert bare (F = ma) style parens to inline LaTeX — for lesson sections. */
  parentheticalMath?: boolean;
}) {
  // LaTeX ($...$ / $$...$$) is always parsed via remark-math + rehype-katex,
  // regardless of where Markdown is used (lessons, forum, assignments, chat).
  const prepared = parentheticalMath ? convertParentheticalMath(source) : source;

  return (
    <div className="prose-lms max-w-none text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={components}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
