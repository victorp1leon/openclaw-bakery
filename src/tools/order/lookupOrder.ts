import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeGwsReadRange, readGwsValuesWithRetries } from "../googleWorkspace/gwsReadValues";

export type OrderLookupItem = {
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

export type OrderLookupResult = {
  query: string;
  timezone: string;
  total: number;
  orders: OrderLookupItem[];
  detail: string;
};

export type LookupOrderToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  limit?: number;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = OrderLookupItem & {
  _dateKey?: string;
  _matchKey: string;
};

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
    const searchKey = normalizeForMatch(`${folio} ${operation_id ?? ""} ${nombre_cliente} ${producto}`);
    return {
      folio,
      fecha_hora_entrega,
      fecha_hora_entrega_iso,
      nombre_cliente,
      producto,
      cantidad: toNumberMaybe(row[7]),
      tipo_envio: row[10] || undefined,
      estado_pago: row[12] || undefined,
      total: toNumberMaybe(row[13]),
      moneda: row[14] || undefined,
      operation_id,
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

function sortRows(a: ParsedOrderRow, b: ParsedOrderRow): number {
  const keyA = a._dateKey ?? "0000-01-01";
  const keyB = b._dateKey ?? "0000-01-01";
  if (keyA !== keyB) return keyB.localeCompare(keyA);
  const dateCmp = b.fecha_hora_entrega.localeCompare(a.fecha_hora_entrega);
  if (dateCmp !== 0) return dateCmp;
  return a.folio.localeCompare(b.folio);
}

export function createLookupOrderTool(config: LookupOrderToolConfig = {}) {
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeGwsReadRange(config.gwsRange, "A:R") ?? "Pedidos!A:R";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const limit = Number.isFinite(config.limit) && (config.limit ?? -1) > 0 ? Math.trunc(config.limit!) : 20;
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function lookupOrder(args: {
    chat_id: string;
    query: string;
    limit?: number;
  }): Promise<OrderLookupResult> {
    const query = args.query.trim();
    if (query.length < 2) {
      throw new Error("order_lookup_query_invalid");
    }
    if (!gwsSpreadsheetId) {
      throw new Error("order_lookup_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("order_lookup_gws_range_missing");
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
      errorPrefix: "order_lookup_gws",
      invalidPayloadError: "order_lookup_gws_invalid_payload",
      commandUnavailableError: "order_lookup_gws_command_unavailable",
      failedError: "order_lookup_gws_failed"
    });

    const parsedRows = mapRows(readResult.rows, timezone);
    const maxRows = Number.isFinite(args.limit) && (args.limit ?? 0) > 0 ? Math.trunc(args.limit!) : limit;
    const filtered = parsedRows
      .filter((row) => matchesQuery(row, query))
      .sort(sortRows)
      .slice(0, maxRows)
      .map(({ _dateKey: _ignoredDateKey, _matchKey: _ignoredMatchKey, ...row }) => row);

    return {
      query,
      timezone,
      total: filtered.length,
      orders: filtered,
      detail: `lookup-order executed (provider=gws, attempt=${readResult.attempt})`
    };
  };
}

export const lookupOrderTool = createLookupOrderTool();
