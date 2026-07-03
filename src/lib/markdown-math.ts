// Fenced/inline code AND already-valid $...$ / $$...$$ math are left untouched.
const PROTECTED = /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)/g;

const PROSE_START =
  /^(?:see|e\.?\s*g\.?|i\.?\s*e\.?|note|optional|figure|fig\.|chapter|ch\.|section|sec\.|ref\.?|about|approx\.?|cf\.|vs\.?)\b/i;

function isLikelyLinkTarget(content: string): boolean {
  const s = content.trim();
  return (
    /^https?:\/\//i.test(s) ||
    /^mailto:/i.test(s) ||
    /^\/[\w./%-]*/.test(s) ||
    /^#[\w-]+$/.test(s)
  );
}

/** Heuristic: parenthetical content looks like math/LaTeX, not plain prose. */
export function looksLikeEquation(content: string): boolean {
  const s = content.trim();
  if (!s || s.length > 200 || s.includes("\n")) return false;
  if (isLikelyLinkTarget(s)) return false;
  if (PROSE_START.test(s)) return false;

  if (/\\[a-zA-Z]/.test(s)) return true;
  if (/[=^_{}]/.test(s)) return true;
  if (/[\u03B1-\u03C9\u0391-\u03A9\u2211-\u221E\u222B\u00B1\u00D7\u00F7π]/.test(s)) return true;
  if (/[A-Za-z]_\{?[A-Za-z0-9]+\}?/.test(s)) return true;
  if (/[A-Za-z0-9]\^[\{\dA-Za-z-]/.test(s)) return true;
  if (/^\d+(\.\d+)?(\s*[×x]\s*10\^?\{?-?\d+\}?)?\s*[a-zA-Z\/^]+/.test(s)) return true;

  if (
    /(?<![a-zA-Z])[+\-*\/](?![a-zA-Z])/.test(s) &&
    /\d|[A-Za-z]/.test(s) &&
    !/\b[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\b/.test(s)
  ) {
    return true;
  }

  return false;
}

/** Index of the ")" that closes the "(" at openIndex, respecting nesting. -1 if unbalanced. */
function findMatchingParen(text: string, openIndex: number): number {
  let depth = 0;
  for (let j = openIndex; j < text.length; j++) {
    if (text[j] === "(") depth++;
    else if (text[j] === ")") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/**
 * Scan plain text left-to-right, converting equation-like (possibly nested)
 * parenthetical groups to inline $...$ math. Pre-existing $...$ spans are
 * already stripped out before this runs (see PROTECTED), so any "$" seen
 * here is incidental (e.g. currency) and is left alone.
 */
function convertInPlainText(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") {
      const end = findMatchingParen(text, i);
      if (end === -1) {
        out += ch;
        i++;
        continue;
      }
      const inner = text.slice(i + 1, end);
      if (looksLikeEquation(inner)) {
        out += `$${inner.trim()}$`;
      } else {
        // Not itself an equation, but a nested group further inside might be
        // (e.g. "(see equation (F = ma) above)").
        out += `(${convertInPlainText(inner)})`;
      }
      i = end + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Turn parenthetical math like (F = ma) into inline $...$ for remark-math. */
export function convertParentheticalMath(markdown: string): string {
  return markdown
    .split(PROTECTED)
    .map((segment) =>
      segment.startsWith("```") || segment.startsWith("`") || segment.startsWith("$")
        ? segment
        : convertInPlainText(segment)
    )
    .join("");
}
