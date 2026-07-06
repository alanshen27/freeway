import pino, { type Logger as PinoLogger } from "pino";
import pinoPretty from "pino-pretty";
import { isProd } from "@/lib/env";

export type LogBindings = Record<string, string | number | boolean | null | undefined>;

function resolveLevel(): pino.LevelWithSilent {
  const raw = (
    process.env.LOG_LEVEL ||
    process.env.WORKER_LOG_LEVEL ||
    (isProd ? "info" : "debug")
  ).toLowerCase();
  const levels: pino.LevelWithSilent[] = [
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace",
    "silent",
  ];
  return levels.includes(raw as pino.LevelWithSilent)
    ? (raw as pino.LevelWithSilent)
    : isProd
      ? "info"
      : "debug";
}

function compact(bindings: LogBindings): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(bindings)) {
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out;
}

function shouldUsePretty(): boolean {
  if (process.env.LOG_PRETTY === "0") return false;
  if (process.env.LOG_PRETTY === "1") return true;
  return !isProd;
}

function createRootLogger(): PinoLogger {
  const level = resolveLevel();
  const base = { service: "freeway" };
  if (shouldUsePretty()) {
    return pino(
      { level, base },
      pinoPretty({
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname,service",
        singleLine: false,
      })
    );
  }
  return pino({
    level,
    base,
    serializers: { err: pino.stdSerializers.err },
  });
}

let _root: PinoLogger | null = null;

/** Shared root logger — JSON in prod, pretty in dev (unless LOG_PRETTY=0). */
export function getRootLogger(): PinoLogger {
  if (!_root) _root = createRootLogger();
  return _root;
}

function mergeBindings(
  base: LogBindings,
  extra?: LogBindings,
  err?: unknown
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...compact(base), ...compact(extra ?? {}) };
  if (err instanceof Error) out.err = err;
  else if (err !== undefined) out.err = { message: String(err) };
  return out;
}

/** Structured logger with child bindings and timed helpers. */
export class AppLogger {
  constructor(
    private readonly pino: PinoLogger,
    private readonly bindings: LogBindings = {}
  ) {}

  child(extra: LogBindings): AppLogger {
    return new AppLogger(this.pino.child(compact(extra)), {
      ...this.bindings,
      ...extra,
    });
  }

  debug(message: string, extra: LogBindings = {}) {
    this.pino.debug(mergeBindings(this.bindings, extra), message);
  }

  info(message: string, extra: LogBindings = {}) {
    this.pino.info(mergeBindings(this.bindings, extra), message);
  }

  warn(message: string, extra: LogBindings = {}, err?: unknown) {
    this.pino.warn(mergeBindings(this.bindings, extra, err), message);
  }

  error(message: string, extra: LogBindings = {}, err?: unknown) {
    this.pino.error(mergeBindings(this.bindings, extra, err), message);
  }

  async timed<T>(
    label: string,
    fn: () => Promise<T>,
    extra: LogBindings = {}
  ): Promise<T> {
    const start = performance.now();
    this.debug(`${label} started`, extra);
    try {
      const result = await fn();
      this.info(`${label} completed`, {
        ...extra,
        durationMs: Math.round(performance.now() - start),
      });
      return result;
    } catch (err) {
      this.error(
        `${label} failed`,
        { ...extra, durationMs: Math.round(performance.now() - start) },
        err
      );
      throw err;
    }
  }
}

export function createLogger(component: string, context: LogBindings = {}): AppLogger {
  return new AppLogger(getRootLogger().child({ component, ...compact(context) }));
}

/** @alias createLogger — used by BullMQ worker + generation pipeline. */
export const createWorkerLogger = createLogger;

export type WorkerLogger = AppLogger;
