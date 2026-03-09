import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

export type OrderReportPeriodFilter =
  | {
    type: "day";
    dateKey: string;
    label: string;
  }
  | {
    type: "week";
    anchorDateKey: string;
    label: string;
  }
  | {
    type: "month";
    year: number;
    month: number;
    label: string;
  }
  | {
    type: "year";
    year: number;
    label: string;
  };

export type OrderReportPeriod = "today" | "tomorrow" | "week" | OrderReportPeriodFilter;

export type OrderReportItem = {
  folio: string;
  fecha_hora_entrega: string;
  fecha_hora_entrega_iso?: string;
  nombre_cliente: string;
  producto: string;
  cantidad?: number;
  tipo_envio?: string;
  estado_pago?: string;
  total?: number;
  moneda?: string;
  operation_id?: string;
};

export type OrderReportResult = {
  period: OrderReportPeriodFilter;
  timezone: string;
  total: number;
  orders: OrderReportItem[];
  detail: string;
};

export type ReportOrdersToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = OrderReportItem & {
  _dateKey?: string;
};

const DAY_MS = 86_400_000;
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
  if (bang === -1) return `${range}!A:R`;
  const sheet = range.slice(0, bang).trim();
  const a1 = range.slice(bang + 1).trim();
  if (!sheet) return undefined;
  if (!a1) return `${sheet}!A:R`;
  if (a1.includes(":")) return `${sheet}!${a1}`;
  return `${sheet}!A:R`;
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

function weekdayIndex(date: Date, timezone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  }).format(date);

  if (wd === "Sun") return 0;
  if (wd === "Mon") return 1;
  if (wd === "Tue") return 2;
  if (wd === "Wed") return 3;
  if (wd === "Thu") return 4;
  if (wd === "Fri") return 5;
  return 6;
}

function buildWeekDateKeys(anchor: Date, timezone: string): Set<string> {
  const weekday = weekdayIndex(anchor, timezone);
  const offsetToMonday = (weekday + 6) % 7;
  const out = new Set<string>();

  for (let i = -offsetToMonday; i <= 6 - offsetToMonday; i += 1) {
    out.add(toDateKeyFromDate(new Date(anchor.getTime() + i * DAY_MS), timezone));
  }

  return out;
}

function dateFromDateKey(dateKey: string): Date | undefined {
  const match = dateKey.match(DATE_KEY_RE);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return undefined;
  }

  return candidate;
}

function monthFromDateKey(dateKey: string): { year: number; month: number } | undefined {
  const match = dateKey.match(DATE_KEY_RE);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function normalizePeriod(args: {
  period: OrderReportPeriod;
  timezone: string;
  now: Date;
}): OrderReportPeriodFilter {
  if (args.period === "today") {
    return {
      type: "day",
      dateKey: toDateKeyFromDate(args.now, args.timezone),
      label: "hoy"
    };
  }

  if (args.period === "tomorrow") {
    return {
      type: "day",
      dateKey: toDateKeyFromDate(new Date(args.now.getTime() + DAY_MS), args.timezone),
      label: "mañana"
    };
  }

  if (args.period === "week") {
    return {
      type: "week",
      anchorDateKey: toDateKeyFromDate(args.now, args.timezone),
      label: "esta semana"
    };
  }

  if (args.period.type === "day") {
    if (!dateFromDateKey(args.period.dateKey)) {
      throw new Error("order_report_period_invalid");
    }
    return args.period;
  }

  if (args.period.type === "week") {
    if (!dateFromDateKey(args.period.anchorDateKey)) {
      throw new Error("order_report_period_invalid");
    }
    return args.period;
  }

  if (!Number.isInteger(args.period.year)) {
    throw new Error("order_report_period_invalid");
  }
  if (args.period.type === "year") {
    return args.period;
  }

  if (!Number.isInteger(args.period.month)) {
    throw new Error("order_report_period_invalid");
  }
  if (args.period.month < 1 || args.period.month > 12) {
    throw new Error("order_report_period_invalid");
  }
  return args.period;
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

function toNumberMaybe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(",", ".");
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    return {
      folio: row[1] ?? "",
      fecha_hora_entrega,
      fecha_hora_entrega_iso,
      nombre_cliente: row[3] ?? "",
      producto: row[5] ?? "",
      cantidad: toNumberMaybe(row[7]),
      tipo_envio: row[10] || undefined,
      estado_pago: row[12] || undefined,
      total: toNumberMaybe(row[13]),
      moneda: row[14] || undefined,
      operation_id: row[17] || undefined,
      _dateKey: extractDateKey(dateSource, timezone)
    };
  }).filter((row) => row.fecha_hora_entrega && row.nombre_cliente && row.producto);
}

function matchesPeriod(args: {
  row: ParsedOrderRow;
  period: OrderReportPeriodFilter;
  timezone: string;
}): boolean {
  if (!args.row._dateKey) return false;

  if (args.period.type === "day") {
    return args.row._dateKey === args.period.dateKey;
  }

  if (args.period.type === "week") {
    const anchor = dateFromDateKey(args.period.anchorDateKey);
    if (!anchor) return false;
    const weekKeys = buildWeekDateKeys(anchor, args.timezone);
    return weekKeys.has(args.row._dateKey);
  }

  const rowMonth = monthFromDateKey(args.row._dateKey);
  if (!rowMonth) return false;
  if (args.period.type === "year") {
    return rowMonth.year === args.period.year;
  }
  return rowMonth.year === args.period.year && rowMonth.month === args.period.month;
}

function sortRows(a: ParsedOrderRow, b: ParsedOrderRow): number {
  const keyA = a._dateKey ?? "9999-12-31";
  const keyB = b._dateKey ?? "9999-12-31";
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  const dateCmp = a.fecha_hora_entrega.localeCompare(b.fecha_hora_entrega);
  if (dateCmp !== 0) return dateCmp;
  return a.folio.localeCompare(b.folio);
}

export function createReportOrdersTool(config: ReportOrdersToolConfig = {}) {
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeReadRange(config.gwsRange) ?? "Pedidos!A:R";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function reportOrders(args: { chat_id: string; period: OrderReportPeriod }): Promise<OrderReportResult> {
    if (!gwsSpreadsheetId) {
      throw new Error("order_report_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("order_report_gws_range_missing");
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
            throw new Error("order_report_gws_invalid_payload");
          }

          const parsedRows = mapRows(rows, timezone);
          const normalizedPeriod = normalizePeriod({
            period: args.period,
            timezone,
            now: now()
          });
          const filtered = parsedRows
            .filter((row) => matchesPeriod({ row, period: normalizedPeriod, timezone }))
            .sort(sortRows)
            .map(({ _dateKey: _ignored, ...row }) => row);

          return {
            period: normalizedPeriod,
            timezone,
            total: filtered.length,
            orders: filtered,
            detail: `report-orders executed (provider=gws, attempt=${attempt}, period=${normalizedPeriod.type})`
          };
        }

        if (retriable && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const token = sanitizeErrorToken((errInfo?.message ?? result.stderr) || `exit_${result.exitCode ?? "unknown"}`);
        throw new Error(`order_report_gws_${token}`);
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "ENOENT") {
          lastError = new Error("order_report_gws_command_unavailable");
          break;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("order_report_gws_failed");
  };
}

export const reportOrdersTool = createReportOrdersTool();
