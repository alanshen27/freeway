import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const STRIP_KEYS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "default",
  "$schema",
]);

/**
 * Thrown when a schema uses constructs strict mode cannot express
 * (z.record → additionalProperties as a schema, z.any/z.unknown → empty schema).
 * Callers skip the strict attempt and go straight to json_object mode.
 */
export class StrictSchemaUnsupportedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "StrictSchemaUnsupportedError";
  }
}

/** Convert Zod → DeepSeek strict tool parameters (additionalProperties: false everywhere). */
export function zodToStrictToolParameters(schema: z.ZodTypeAny): Record<string, unknown> {
  const raw = zodToJsonSchema(schema, {
    $refStrategy: "none",
    target: "jsonSchema7",
    name: "SubmitResult",
  }) as Record<string, unknown>;

  const root =
    (raw.definitions as Record<string, unknown> | undefined)?.SubmitResult ?? raw;

  return normalizeStrictNode(root) as Record<string, unknown>;
}

function normalizeStrictNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(normalizeStrictNode);
  }
  if (!node || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (STRIP_KEYS.has(key)) continue;
    out[key] = value;
  }

  if (out.type === "object") {
    if (out.properties && typeof out.properties === "object") {
      const props = out.properties as Record<string, unknown>;
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        normalized[key] = normalizeStrictNode(value);
      }
      out.properties = normalized;
      out.required = Object.keys(normalized);
      out.additionalProperties = false;
    } else {
      // z.record() — additionalProperties would be a schema (a "map"), which
      // DeepSeek strict mode rejects ("expected a boolean").
      throw new StrictSchemaUnsupportedError(
        "free-form object (z.record) cannot be expressed in strict mode"
      );
    }
  }

  if (out.type === "array" && out.items) {
    out.items = normalizeStrictNode(out.items);
  }

  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    if (Array.isArray(out[key])) {
      out[key] = (out[key] as unknown[]).map(normalizeStrictNode);
    }
  }

  if (out.enum && out.type === "string") {
    // DeepSeek strict enum — keep as-is
  }

  return out;
}
