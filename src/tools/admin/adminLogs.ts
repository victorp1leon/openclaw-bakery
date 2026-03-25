import { v4 as uuidv4 } from "uuid";

import { db } from "../../state/database";
import { type OperationStatus } from "../../state/operations";

type OperationLogRow = {
  operation_id: string;
  chat_id: string;
  intent: string;
  status: OperationStatus;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

export type AdminLogsFilters = {
  chat_id?: string;
  operation_id?: string;
  limit?: number;
};

export type AdminLogEntry = {
  operation_id: string;
  chat_id: string;
  intent: string;
  status: OperationStatus;
  payload_preview: string;
  created_at: string;
  updated_at: string;
};

export type AdminLogsResult = {
  status: "ok";
  filters: {
    chat_id?: string;
    operation_id?: string;
    limit: number;
  };
  total: number;
  entries: AdminLogEntry[];
  trace_ref: string;
  detail: string;
  generated_at: string;
};

export type AdminLogsToolConfig = {
  now?: () => Date;
  newTraceId?: () => string;
  defaultLimit?: number;
  maxLimit?: number;
  queryRowsFn?: (filters: { chat_id?: string; operation_id?: string; limit: number }) => OperationLogRow[];
};

function sanitizeText(value: string): string {
  let out = value
    .replace(
      /\b(token|secret|api[_-]?key|password|authorization|bearer)\b\s*[:=]\s*([^\s,;]+)/gi,
      (_match, key: string) => `${key}=REDACTED`
    )
    .replace(/\bbearer\s+[a-z0-9._-]+\b/gi, "bearer REDACTED");

  out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, "REDACTED_AWS_ACCESS_KEY_ID");
  out = out.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gi, "REDACTED_GITHUB_TOKEN");
  out = out.replace(/\bsk-[A-Za-z0-9][A-Za-z0-9_-]{20,}\b/g, "REDACTED_API_TOKEN");
  return out;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/(token|secret|api[_-]?key|password|authorization)/i.test(key)) {
        out[key] = "REDACTED";
      } else {
        out[key] = sanitizeValue(entry);
      }
    }
    return out;
  }
  return value;
}

function compactPreview(value: string, maxChars = 220): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "-";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

function toPayloadPreview(payloadJson: string): string {
  const raw = payloadJson.trim();
  if (!raw) return "-";

  try {
    const parsed = JSON.parse(raw);
    return compactPreview(JSON.stringify(sanitizeValue(parsed)));
  } catch {
    return compactPreview(sanitizeText(raw));
  }
}

function resolveLimit(value: number | undefined, fallback: number, maxLimit: number): number {
  const base = Number.isInteger(value) ? (value as number) : fallback;
  const bounded = Math.max(1, Math.min(maxLimit, Math.trunc(base)));
  return Number.isFinite(bounded) ? bounded : fallback;
}

function defaultQueryRows(filters: { chat_id?: string; operation_id?: string; limit: number }): OperationLogRow[] {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filters.chat_id) {
    where.push("chat_id = ?");
    params.push(filters.chat_id);
  }
  if (filters.operation_id) {
    where.push("operation_id = ?");
    params.push(filters.operation_id);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT operation_id, chat_id, intent, status, payload_json, created_at, COALESCE(updated_at, created_at) AS updated_at
    FROM operations
    ${whereClause}
    ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
    LIMIT ?
  `;

  params.push(filters.limit);
  return db.prepare(sql).all(...params) as OperationLogRow[];
}

export function createAdminLogsTool(config: AdminLogsToolConfig = {}) {
  const now = config.now ?? (() => new Date());
  const newTraceId = config.newTraceId ?? uuidv4;
  const defaultLimit = resolveLimit(config.defaultLimit, 10, 50);
  const maxLimit = resolveLimit(config.maxLimit, 20, 50);
  const queryRowsFn = config.queryRowsFn ?? defaultQueryRows;

  return async (args: { chat_id: string; filters?: AdminLogsFilters }): Promise<AdminLogsResult> => {
    const filters = args.filters ?? {};
    const limit = resolveLimit(filters.limit, defaultLimit, maxLimit);
    const chatId = filters.chat_id?.trim() || undefined;
    const operationId = filters.operation_id?.trim() || undefined;

    const rows = queryRowsFn({
      chat_id: chatId,
      operation_id: operationId,
      limit
    });

    const entries = rows.map((row) => ({
      operation_id: row.operation_id,
      chat_id: row.chat_id,
      intent: row.intent,
      status: row.status,
      payload_preview: toPayloadPreview(row.payload_json),
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return {
      status: "ok",
      filters: {
        ...(chatId ? { chat_id: chatId } : {}),
        ...(operationId ? { operation_id: operationId } : {}),
        limit
      },
      total: entries.length,
      entries,
      trace_ref: `admin-logs:${newTraceId()}`,
      detail: `admin-logs executed (rows=${entries.length})`,
      generated_at: now().toISOString()
    };
  };
}
