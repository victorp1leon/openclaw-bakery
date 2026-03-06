import { createHash } from "node:crypto";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function canonicalize(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const out: Record<string, JsonValue> = {};
    for (const key of sortedKeys) {
      out[key] = canonicalize(record[key]);
    }
    return out;
  }

  return String(value);
}

export function buildIdempotencyKey(args: {
  chat_id: string;
  intent: string;
  payload: unknown;
  timestampMs?: number;
  windowMinutes?: number;
}): string {
  const timestampMs = args.timestampMs ?? Date.now();
  const windowMinutes = args.windowMinutes ?? 10;
  const bucket = Math.floor(timestampMs / (windowMinutes * 60 * 1000));
  const canonicalPayload = JSON.stringify(canonicalize(args.payload));

  return createHash("sha256")
    .update(`${args.chat_id}|${args.intent}|${bucket}|${canonicalPayload}`)
    .digest("hex");
}
