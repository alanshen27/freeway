/** Build a full failure report from manim stdout/stderr for the LLM fixer. */
export function formatManimRenderFailure(
  exitCode: number | null,
  stdout: string,
  stderr: string
): string {
  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
  const header = `exit code: ${exitCode ?? "unknown"}`;
  if (!combined) {
    return `${header}\n(no stdout/stderr captured)`;
  }

  // Prefer the full capture when it fits — avoids losing context in truncated tails.
  if (combined.length <= 14_000) {
    return `${header}\n\n${combined}`;
  }

  const lines = combined.split("\n");
  const parts = [header, `output lines: ${lines.length}`];

  let tracebackStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Traceback (most recent call last)")) tracebackStart = i;
  }
  if (tracebackStart >= 0) {
    parts.push("=== Python traceback ===", lines.slice(tracebackStart).join("\n"));
  }

  const errorLine = lines.findIndex(
    (l) =>
      /^(Error|TypeError|ValueError|SyntaxError|ManimCommunityError):/.test(l.trim()) ||
      l.includes("get_type_error_message") ||
      l.includes("compile_tex") ||
      /^LaTeX Error:/i.test(l.trim()) ||
      /^! /.test(l.trim())
  );
  if (errorLine >= 0) {
    parts.push(
      "=== Error context ===",
      lines.slice(Math.max(0, errorLine - 10), errorLine + 40).join("\n")
    );
  }

  parts.push("=== Output tail ===", lines.slice(-80).join("\n"));
  return parts.join("\n\n").slice(0, 14_000);
}

export class ManimRenderError extends Error {
  readonly exitCode: number | null;
  readonly detail: string;

  constructor(exitCode: number | null, stdout: string, stderr: string) {
    const detail = formatManimRenderFailure(exitCode, stdout, stderr);
    super(`manim render exited ${exitCode ?? "unknown"}`);
    this.name = "ManimRenderError";
    this.exitCode = exitCode;
    this.detail = detail;
  }
}
