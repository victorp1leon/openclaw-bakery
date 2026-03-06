function stripAnsi(input: string): string {
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

export function parseJsonFromText(raw: string): unknown {
  const text = stripAnsi(raw).trim();
  if (!text) {
    throw new Error("empty_openclaw_output");
  }

  try {
    return JSON.parse(text);
  } catch {
    // keep trying below
  }

  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced.trim());
    } catch {
      // keep trying below
    }
  }

  const firstObj = text.indexOf("{");
  const lastObj = text.lastIndexOf("}");
  if (firstObj >= 0 && lastObj > firstObj) {
    try {
      return JSON.parse(text.slice(firstObj, lastObj + 1));
    } catch {
      // keep trying below
    }
  }

  const firstArr = text.indexOf("[");
  const lastArr = text.lastIndexOf("]");
  if (firstArr >= 0 && lastArr > firstArr) {
    return JSON.parse(text.slice(firstArr, lastArr + 1));
  }

  throw new Error("openclaw_json_parse_error");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function unwrapOpenClawPayloadJson(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const payloads = raw.payloads;
  if (!Array.isArray(payloads)) return raw;

  for (const payload of payloads) {
    if (!isRecord(payload)) continue;
    const text = payload.text;
    if (typeof text !== "string" || !text.trim()) continue;

    try {
      return parseJsonFromText(text);
    } catch {
      // keep trying next payload
    }
  }

  return raw;
}

export function firstOpenClawPayloadText(raw: unknown): string | undefined {
  if (!isRecord(raw)) return undefined;
  const payloads = raw.payloads;
  if (!Array.isArray(payloads)) return undefined;

  for (const payload of payloads) {
    if (!isRecord(payload)) continue;
    const text = payload.text;
    if (typeof text === "string" && text.trim()) return text.trim();
  }

  return undefined;
}
