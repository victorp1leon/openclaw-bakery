import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

export type OrderOperationalStatus = "programado" | "hoy" | "atrasado" | "cancelado";

export type OrderStatusItem = {
  folio: string;
  fecha_hora_entrega: string;
  fecha_hora_entrega_iso?: string;
  nombre_cliente: string;
  producto: string;
  estado_pago?: string;
  estado_operativo: OrderOperationalStatus;
  total?: number;
  moneda?: string;
  notas?: string;
  operation_id?: string;
};

export type OrderStatusResult = {
  query: string;
  timezone: string;
  total: number;
  orders: OrderStatusItem[];
  detail: string;
};

export type OrderStatusToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  limit?: number;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = {
  folio: string;
  fecha_hora_entrega: string;
  fecha_hora_entrega_iso?: string;
  nombre_cliente: string;
  producto: string;
  estado_pago?: string;
  total?: number;
  moneda?: string;
  notas?: string;
  operation_id?: string;
  estado_pedido?: string;
  _dateKey?: string;
  _matchKey: string;
};

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseJsonText(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractGwsError(value: unknown): { code?: number; message?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;

  if (root.error && typeof root.error === "object") {
    const errObj = root.error as Record<string, unknown>;
    const code = typeof errObj.code === "number" ? errObj.code : undefined;
    const message = typeof errObj.message === "string" ? errObj.message : undefined;
    return { code, message };
  }

  const code = typeof root.code === "number" ? root.code : undefined;
  const message = typeof root.message === "string" ? root.message : undefined;
  if (code !== undefined || message !== undefined) {
    return { code, message };
  }

  return undefined;
}

function classifyGwsSpawnError(err: unknown): "network" | "other" {
  if (!(err instanceof Error)) return "other";
  const code = (err as NodeJS.ErrnoException).code;
  if (!code) return "other";
  if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED"].includes(code)) return "network";
  return "other";
}

function isRetriableGwsFailure(args: { timedOut: boolean; code?: number; stdout: string; stderr: string }): boolean {
  if (args.timedOut) return true;
  if (typeof args.code === "number" && (args.code === 429 || args.code >= 500)) return true;

  const combined = `${args.stdout}\n${args.stderr}`.toLowerCase();
  return /(timeout|timed out|econnreset|enotfound|eai_again|network|temporar|rate limit|429)/.test(combined);
}

function normalizeReadRange(value: string | undefined): string | undefined {
  const range = value?.trim();
  if (!range) return undefined;

  const bang = range.indexOf("!");
  if (bang === -1) return `${range}!A:U`;
  const sheet = range.slice(0, bang).trim();
  const a1 = range.slice(bang + 1).trim();
  if (!sheet) return undefined;
  if (!a1) return `${sheet}!A:U`;
  if (a1.includes(":")) return `${sheet}!${a1}`;
  return `${sheet}!A:U`;
}

function readValuesFromGwsPayload(value: unknown): string[][] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;

  const candidates: unknown[] = [
    root.values,
    (root.data as Record<string, unknown> | undefined)?.values,
    (root.result as Record<string, unknown> | undefined)?.values,
    (root.response as Record<string, unknown> | undefined)?.values
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map((row) => {
      if (!Array.isArray(row)) return [];
      return row.map((cell) => (cell == null ? "" : String(cell)));
    });
  }

  return undefined;
}

function toNumberMaybe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(",", ".");
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDateKeyFromDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const y = parts.find((part) => part.type === "year")?.value ?? "0000";
  const m = parts.find((part) => part.type === "month")?.value ?? "01";
  const d = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function extractDateKey(raw: string, timezone: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const ymd = value.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const dmy = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return toDateKeyFromDate(new Date(parsed), timezone);
  }

  return undefined;
}

function dateFromDateKey(dateKey: string): Date | undefined {
  const match = dateKey.match(DATE_KEY_RE);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  return normalized.includes("fecha_hora_entrega") && normalized.includes("nombre_cliente");
}

function mapRows(rows: string[][], timezone: string): ParsedOrderRow[] {
  const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    const fecha_hora_entrega = row[2] ?? "";
    const fecha_hora_entrega_iso = row[18] || undefined;
    const dateSource = fecha_hora_entrega_iso || fecha_hora_entrega;
    const folio = row[1] ?? "";
    const operation_id = row[17] || undefined;
    const nombre_cliente = row[3] ?? "";
    const producto = row[5] ?? "";
    const notas = row[15] || undefined;
    const searchKey = normalizeForMatch(`${folio} ${operation_id ?? ""} ${nombre_cliente} ${producto}`);
    return {
      folio,
      fecha_hora_entrega,
      fecha_hora_entrega_iso,
      nombre_cliente,
      producto,
      estado_pago: row[12] || undefined,
      total: toNumberMaybe(row[13]),
      moneda: row[14] || undefined,
      notas,
      operation_id,
      estado_pedido: row[19] || undefined,
      _dateKey: extractDateKey(dateSource, timezone),
      _matchKey: searchKey
    };
  }).filter((row) => row.fecha_hora_entrega && row.nombre_cliente && row.producto);
}

function matchesQuery(row: ParsedOrderRow, query: string): boolean {
  const q = normalizeForMatch(query);
  if (!q || q.length < 2) return false;

  const folio = normalizeForMatch(row.folio);
  const operationId = normalizeForMatch(row.operation_id ?? "");
  if (folio === q || operationId === q) return true;

  const tokens = q.split(/\s+/).filter((token) => token.length >= 2);
  if (tokens.length === 0) return false;

  return tokens.every((token) => row._matchKey.includes(token));
}

function deriveOperationalStatus(row: ParsedOrderRow, todayDateKey: string): OrderOperationalStatus {
  if (row.estado_pedido && normalizeForMatch(row.estado_pedido) === "cancelado") {
    return "cancelado";
  }
  const notesNormalized = normalizeForMatch(row.notas ?? "");
  if (notesNormalized.includes("[cancelado]")) {
    return "cancelado";
  }

  if (!row._dateKey) {
    return "programado";
  }

  if (row._dateKey === todayDateKey) {
    return "hoy";
  }

  if (row._dateKey < todayDateKey) {
    return "atrasado";
  }

  return "programado";
}

function distanceToToday(dateKey: string | undefined, todayDateKey: string): number {
  if (!dateKey) return Number.POSITIVE_INFINITY;
  const date = dateFromDateKey(dateKey);
  const today = dateFromDateKey(todayDateKey);
  if (!date || !today) return Number.POSITIVE_INFINITY;
  const delta = date.getTime() - today.getTime();
  return Math.abs(Math.trunc(delta / 86_400_000));
}

function sortRows(todayDateKey: string) {
  return (a: ParsedOrderRow, b: ParsedOrderRow): number => {
    const distA = distanceToToday(a._dateKey, todayDateKey);
    const distB = distanceToToday(b._dateKey, todayDateKey);
    if (distA !== distB) return distA - distB;

    const keyA = a._dateKey ?? "9999-12-31";
    const keyB = b._dateKey ?? "9999-12-31";
    if (keyA !== keyB) return keyA.localeCompare(keyB);

    const dateCmp = a.fecha_hora_entrega.localeCompare(b.fecha_hora_entrega);
    if (dateCmp !== 0) return dateCmp;
    return a.folio.localeCompare(b.folio);
  };
}

export function createOrderStatusTool(config: OrderStatusToolConfig = {}) {
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeReadRange(config.gwsRange) ?? "Pedidos!A:U";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const limit = Number.isFinite(config.limit) && (config.limit ?? -1) > 0 ? Math.trunc(config.limit!) : 20;
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function orderStatus(args: {
    chat_id: string;
    query: string;
    limit?: number;
  }): Promise<OrderStatusResult> {
    const query = args.query.trim();
    if (query.length < 2) {
      throw new Error("order_status_query_invalid");
    }
    if (!gwsSpreadsheetId) {
      throw new Error("order_status_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("order_status_gws_range_missing");
    }

    const params = {
      spreadsheetId: gwsSpreadsheetId,
      range: normalizedRange
    };

    const attempts = maxRetries + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await gwsRunner({
          command: gwsCommand,
          commandArgs: [
            ...gwsCommandArgs,
            "sheets",
            "spreadsheets",
            "values",
            "get",
            "--params",
            JSON.stringify(params)
          ],
          timeoutMs
        });

        const parsedStdout = parseJsonText(result.stdout);
        const parsedStderr = parseJsonText(result.stderr);
        const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);
        const retriable = isRetriableGwsFailure({
          timedOut: result.timedOut,
          code: errInfo?.code,
          stdout: result.stdout,
          stderr: result.stderr
        });

        if (!result.timedOut && result.exitCode === 0 && !errInfo) {
          const rows = readValuesFromGwsPayload(parsedStdout);
          if (!rows) {
            throw new Error("order_status_gws_invalid_payload");
          }

          const parsedRows = mapRows(rows, timezone);
          const todayDateKey = toDateKeyFromDate(now(), timezone);
          const maxRows = Number.isFinite(args.limit) && (args.limit ?? 0) > 0 ? Math.trunc(args.limit!) : limit;
          const filtered = parsedRows
            .filter((row) => matchesQuery(row, query))
            .sort(sortRows(todayDateKey))
            .slice(0, maxRows)
            .map((row) => ({
              folio: row.folio,
              fecha_hora_entrega: row.fecha_hora_entrega,
              fecha_hora_entrega_iso: row.fecha_hora_entrega_iso,
              nombre_cliente: row.nombre_cliente,
              producto: row.producto,
              estado_pago: row.estado_pago,
              estado_operativo: deriveOperationalStatus(row, todayDateKey),
              total: row.total,
              moneda: row.moneda,
              notas: row.notas,
              operation_id: row.operation_id
            }));

          return {
            query,
            timezone,
            total: filtered.length,
            orders: filtered,
            detail: `order-status executed (provider=gws, attempt=${attempt})`
          };
        }

        if (retriable && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const token = sanitizeErrorToken((errInfo?.message ?? result.stderr) || `exit_${result.exitCode ?? "unknown"}`);
        throw new Error(`order_status_gws_${token}`);
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }
        if (err instanceof Error && /ENOENT/.test(err.message)) {
          throw new Error("order_status_gws_command_unavailable");
        }
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }
        break;
      }
    }

    throw lastError ?? new Error("order_status_failed");
  };
}

export const orderStatusTool = createOrderStatusTool();
