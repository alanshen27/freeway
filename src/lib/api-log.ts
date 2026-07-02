import { createLogger, type LogBindings } from "@/lib/logger";

/** Log API route lifecycle (start / complete / fail + duration). */
export async function withApiLog<T>(
  route: string,
  meta: LogBindings,
  fn: () => Promise<T>
): Promise<T> {
  const log = createLogger("api", { route, ...meta });
  const start = performance.now();
  log.info("request started");
  try {
    const result = await fn();
    log.info("request completed", {
      durationMs: Math.round(performance.now() - start),
    });
    return result;
  } catch (err) {
    log.error(
      "request failed",
      { durationMs: Math.round(performance.now() - start) },
      err
    );
    throw err;
  }
}
