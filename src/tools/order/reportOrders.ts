import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeGwsReadRange, readGwsValuesWithRetries } from "../googleWorkspace/gwsReadValues";

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
  estado_pedido?: string;
};

export type OrderReportInconsistency = {
  reference: string;
  reason: "delivery_date_missing_or_invalid";
  detail: string;
};

export type OrderReportResult = {
  period: OrderReportPeriodFilter;
  timezone: string;
  total: number;
  orders: OrderReportItem[];
  inconsistencies: OrderReportInconsistency[];
  trace_ref: string;
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
  limit?: number;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = OrderReportItem & {
  _dateKey?: string;
  _dateInvalid: boolean;
  _sourceRow: number;
};

type RowMapResult = {
  rows: ParsedOrderRow[];
  inconsistencies: OrderReportInconsistency[];
};

type ColumnKey =
  | "folio"
  | "fecha_hora_entrega"
  | "fecha_hora_entrega_iso"
  | "nombre_cliente"
  | "producto"
  | "cantidad"
  | "tipo_envio"
  | "estado_pago"
  | "total"
  | "moneda"
  | "operation_id"
  | "estado_pedido";

const DEFAULT_INDEX: Record<ColumnKey, number> = {
  folio: 1,
  fecha_hora_entrega: 2,
  fecha_hora_entrega_iso: 18,
  nombre_cliente: 3,
  producto: 5,
  cantidad: 7,
  tipo_envio: 10,
  estado_pago: 12,
  total: 13,
  moneda: 14,
  operation_id: 17,
  estado_pedido: 19
};

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  folio: ["folio"],
  fecha_hora_entrega: ["fecha_hora_entrega", "fecha_entrega", "entrega_fecha_hora"],
  fecha_hora_entrega_iso: ["fecha_hora_entrega_iso", "fecha_entrega_iso"],
  nombre_cliente: ["nombre_cliente", "cliente", "nombre"],
  producto: ["producto", "nombre_producto"],
  cantidad: ["cantidad"],
  tipo_envio: ["tipo_envio", "envio", "tipo_de_envio"],
  estado_pago: ["estado_pago", "pago_estado"],
  total: ["total"],
  moneda: ["moneda"],
  operation_id: ["operation_id", "operacion_id", "id_operacion", "id"],
  estado_pedido: ["estado_pedido", "pedido_estado"]
};

const DAY_MS = 86_400_000;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function normalizeHeaderCell(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeHeaderCell(cell));
  return normalized.includes("fecha_hora_entrega") && normalized.includes("nombre_cliente");
}

function resolveColumnIndexMap(headerRow: string[]): Record<ColumnKey, number> {
  const byHeader = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    const key = normalizeHeaderCell(cell);
    if (key.length > 0 && !byHeader.has(key)) {
      byHeader.set(key, idx);
    }
  });

  const out: Record<ColumnKey, number> = { ...DEFAULT_INDEX };
  for (const key of Object.keys(DEFAULT_INDEX) as ColumnKey[]) {
    const aliases = HEADER_ALIASES[key];
    const found = aliases.find((alias) => byHeader.has(alias));
    if (found) {
      out[key] = byHeader.get(found)!;
    }
  }
  return out;
}

function buildTraceRef(period: OrderReportPeriodFilter, attempt: number): string {
  const token = period.type === "day"
    ? `day-${period.dateKey}`
    : period.type === "week"
      ? `week-${period.anchorDateKey}`
      : period.type === "month"
        ? `month-${period.year}-${String(period.month).padStart(2, "0")}`
        : `year-${period.year}`;

  return `report-orders:${token}:a${attempt}`;
}

function mapRows(rows: string[][], timezone: string): RowMapResult {
  const hasHeader = rows.length > 0 && isHeaderRow(rows[0]);
  const columnMap = hasHeader ? resolveColumnIndexMap(rows[0]) : DEFAULT_INDEX;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const firstDataRowNumber = hasHeader ? 2 : 1;

  const mappedRows: ParsedOrderRow[] = [];
  const inconsistencies: OrderReportInconsistency[] = [];

  for (let idx = 0; idx < dataRows.length; idx += 1) {
    const row = dataRows[idx];
    const sourceRow = firstDataRowNumber + idx;
    const joined = row.join("").trim();
    if (!joined) continue;

    const folio = row[columnMap.folio] ?? "";
    const operation_id = row[columnMap.operation_id] || undefined;
    const fecha_hora_entrega = row[columnMap.fecha_hora_entrega] ?? "";
    const fecha_hora_entrega_iso = row[columnMap.fecha_hora_entrega_iso] || undefined;
    const nombre_cliente = row[columnMap.nombre_cliente] ?? "";
    const producto = row[columnMap.producto] ?? "";

    if (!fecha_hora_entrega || !nombre_cliente || !producto) {
      continue;
    }

    const dateSource = fecha_hora_entrega_iso || fecha_hora_entrega;
    const dateKey = extractDateKey(dateSource, timezone);
    const dateInvalid = !dateKey;

    const parsed: ParsedOrderRow = {
      folio,
      fecha_hora_entrega,
      fecha_hora_entrega_iso,
      nombre_cliente,
      producto,
      cantidad: toNumberMaybe(row[columnMap.cantidad]),
      tipo_envio: row[columnMap.tipo_envio] || undefined,
      estado_pago: row[columnMap.estado_pago] || undefined,
      total: toNumberMaybe(row[columnMap.total]),
      moneda: row[columnMap.moneda] || undefined,
      operation_id,
      estado_pedido: row[columnMap.estado_pedido] || undefined,
      _dateKey: dateKey,
      _dateInvalid: dateInvalid,
      _sourceRow: sourceRow
    };

    if (dateInvalid) {
      const reference = folio.trim() || operation_id?.trim() || `fila_${sourceRow}`;
      inconsistencies.push({
        reference,
        reason: "delivery_date_missing_or_invalid",
        detail: fecha_hora_entrega_iso?.trim() || fecha_hora_entrega.trim() || "sin fecha"
      });
    }

    mappedRows.push(parsed);
  }

  return {
    rows: mappedRows,
    inconsistencies
  };
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
  const keyA = a._dateKey ?? "0000-01-01";
  const keyB = b._dateKey ?? "0000-01-01";
  if (keyA !== keyB) return keyB.localeCompare(keyA);

  const dateCmp = b.fecha_hora_entrega.localeCompare(a.fecha_hora_entrega);
  if (dateCmp !== 0) return dateCmp;
  return a.folio.localeCompare(b.folio);
}

export function createReportOrdersTool(config: ReportOrdersToolConfig = {}) {
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeGwsReadRange(config.gwsRange, "A:U") ?? "Pedidos!A:U";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const limit = Number.isFinite(config.limit) && (config.limit ?? -1) > 0 ? Math.trunc(config.limit!) : 10;
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function reportOrders(args: { chat_id: string; period: OrderReportPeriod; limit?: number }): Promise<OrderReportResult> {
    if (!gwsSpreadsheetId) {
      throw new Error("order_report_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("order_report_gws_range_missing");
    }

    const readResult = await readGwsValuesWithRetries({
      command: gwsCommand,
      commandArgs: gwsCommandArgs,
      spreadsheetId: gwsSpreadsheetId,
      range: normalizedRange,
      timeoutMs,
      maxRetries,
      retryBackoffMs,
      runner: gwsRunner,
      errorPrefix: "order_report_gws",
      invalidPayloadError: "order_report_gws_invalid_payload",
      commandUnavailableError: "order_report_gws_command_unavailable",
      failedError: "order_report_gws_failed"
    });

    const mapped = mapRows(readResult.rows, timezone);
    const normalizedPeriod = normalizePeriod({
      period: args.period,
      timezone,
      now: now()
    });

    const maxRows = Number.isFinite(args.limit) && (args.limit ?? 0) > 0 ? Math.trunc(args.limit!) : limit;
    const filteredRows = mapped.rows
      .filter((row) => matchesPeriod({ row, period: normalizedPeriod, timezone }))
      .sort(sortRows);

    const orders = filteredRows
      .slice(0, maxRows)
      .map(({ _dateKey: _ignoredDateKey, _dateInvalid: _ignoredDateInvalid, _sourceRow: _ignoredSourceRow, ...row }) => row);

    return {
      period: normalizedPeriod,
      timezone,
      total: filteredRows.length,
      orders,
      inconsistencies: mapped.inconsistencies,
      trace_ref: buildTraceRef(normalizedPeriod, readResult.attempt),
      detail: `report-orders executed (provider=gws, attempt=${readResult.attempt}, period=${normalizedPeriod.type}, inconsistencies=${mapped.inconsistencies.length})`
    };
  };
}

export const reportOrdersTool = createReportOrdersTool();
