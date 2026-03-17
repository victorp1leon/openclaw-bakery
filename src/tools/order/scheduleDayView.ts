import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeGwsReadRange, readGwsValuesWithRetries } from "../googleWorkspace/gwsReadValues";

export type ScheduleDayFilter = {
  type: "day";
  dateKey: string;
  label: string;
};

export type ScheduleDayDeliveryItem = {
  folio: string;
  operation_id?: string;
  fecha_hora_entrega: string;
  fecha_hora_entrega_iso?: string;
  nombre_cliente: string;
  producto: string;
  cantidad: number;
  tipo_envio?: string;
  estado_pago?: string;
  total?: number;
  moneda?: string;
  estado_pedido?: string;
};

export type ScheduleDayPreparationItem = {
  product: string;
  quantity: number;
  orders: number;
};

export type ScheduleDayPurchaseItem = {
  item: string;
  unit: string;
  amount: number;
  sourceProducts: string[];
};

export type ScheduleDayViewResult = {
  day: ScheduleDayFilter;
  timezone: string;
  totalOrders: number;
  deliveries: ScheduleDayDeliveryItem[];
  preparation: ScheduleDayPreparationItem[];
  suggestedPurchases: ScheduleDayPurchaseItem[];
  assumptions: string[];
  detail: string;
};

export type ScheduleDayViewToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = ScheduleDayDeliveryItem & {
  _dateKey?: string;
  _productKey: string;
  _isCanceled: boolean;
};

type PurchaseRecipeItem = {
  item: string;
  unit: string;
  perUnit: number;
};

type PurchaseRecipeProfile = {
  aliases: string[];
  items: PurchaseRecipeItem[];
};

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const DEFAULT_RECIPE_PROFILES: PurchaseRecipeProfile[] = [
  {
    aliases: ["cupcake", "cupcakes"],
    items: [
      { item: "harina", unit: "g", perUnit: 45 },
      { item: "azucar", unit: "g", perUnit: 35 },
      { item: "mantequilla", unit: "g", perUnit: 28 },
      { item: "huevo", unit: "pza", perUnit: 0.8 }
    ]
  },
  {
    aliases: ["pastel", "cake"],
    items: [
      { item: "harina", unit: "g", perUnit: 220 },
      { item: "azucar", unit: "g", perUnit: 160 },
      { item: "mantequilla", unit: "g", perUnit: 140 },
      { item: "huevo", unit: "pza", perUnit: 4 },
      { item: "betun", unit: "g", perUnit: 180 }
    ]
  },
  {
    aliases: ["galleta", "galletas", "cookie", "cookies"],
    items: [
      { item: "harina", unit: "g", perUnit: 30 },
      { item: "azucar", unit: "g", perUnit: 18 },
      { item: "mantequilla", unit: "g", perUnit: 14 }
    ]
  },
  {
    aliases: ["brownie", "brownies"],
    items: [
      { item: "harina", unit: "g", perUnit: 32 },
      { item: "azucar", unit: "g", perUnit: 24 },
      { item: "mantequilla", unit: "g", perUnit: 20 },
      { item: "chocolate", unit: "g", perUnit: 28 },
      { item: "huevo", unit: "pza", perUnit: 0.5 }
    ]
  },
  {
    aliases: ["dona", "donas", "donut", "donuts"],
    items: [
      { item: "harina", unit: "g", perUnit: 38 },
      { item: "azucar", unit: "g", perUnit: 18 },
      { item: "huevo", unit: "pza", perUnit: 0.4 },
      { item: "aceite", unit: "ml", perUnit: 14 }
    ]
  }
];

function normalizeForMatch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizePhrase(text: string): string {
  return normalizeForMatch(text).replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function toNumberMaybe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(",", ".");
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  if (!Number.isFinite(parsed)) return undefined;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(parsed));

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("fecha_hora_entrega") && normalized.includes("nombre_cliente");
}

function isCanceledOrder(estadoPedido: string | undefined, notas: string | undefined): boolean {
  if (normalizeForMatch(estadoPedido ?? "") === "cancelado") {
    return true;
  }

  const notes = normalizeForMatch(notas ?? "");
  return /\bcancelado\b/.test(notes);
}

function mapRows(rows: string[][], timezone: string, assumptions: string[]): ParsedOrderRow[] {
  const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const fecha_hora_entrega = row[2] ?? "";
      const fecha_hora_entrega_iso = row[18] || undefined;
      const dateSource = fecha_hora_entrega_iso || fecha_hora_entrega;
      const folio = row[1] ?? "";
      const operation_id = row[17] || undefined;
      const nombre_cliente = row[3] ?? "";
      const producto = row[5] ?? "";
      const tipo_envio = row[10] || undefined;
      const estado_pago = row[12] || undefined;
      const total = toNumberMaybe(row[13]);
      const moneda = row[14] || undefined;
      const estado_pedido = row[19] || undefined;
      const notas = row[15] || undefined;
      const rawCantidad = toNumberMaybe(row[7]);
      const cantidad = rawCantidad != null && rawCantidad > 0 ? Math.trunc(rawCantidad) : 1;

      if (rawCantidad == null || rawCantidad <= 0) {
        assumptions.push(`pedido ${folio || operation_id || producto || "sin_referencia"} sin cantidad valida; se asumio 1`);
      }

      return {
        folio,
        operation_id,
        fecha_hora_entrega,
        fecha_hora_entrega_iso,
        nombre_cliente,
        producto,
        cantidad,
        tipo_envio,
        estado_pago,
        total,
        moneda,
        estado_pedido,
        _dateKey: extractDateKey(dateSource, timezone),
        _productKey: normalizePhrase(producto),
        _isCanceled: isCanceledOrder(estado_pedido, notas)
      };
    })
    .filter((row) => row.fecha_hora_entrega && row.producto);
}

function sortRows(a: ParsedOrderRow, b: ParsedOrderRow): number {
  const keyA = a._dateKey ?? "9999-12-31";
  const keyB = b._dateKey ?? "9999-12-31";
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  const dateCmp = a.fecha_hora_entrega.localeCompare(b.fecha_hora_entrega);
  if (dateCmp !== 0) return dateCmp;
  return a.folio.localeCompare(b.folio);
}

function aggregatePreparation(rows: ParsedOrderRow[]): ScheduleDayPreparationItem[] {
  const byProduct = new Map<string, ScheduleDayPreparationItem>();

  for (const row of rows) {
    const key = row._productKey || normalizePhrase(row.producto) || "producto_no_identificado";
    const current = byProduct.get(key);
    if (!current) {
      byProduct.set(key, {
        product: row.producto,
        quantity: row.cantidad,
        orders: 1
      });
      continue;
    }

    current.quantity += row.cantidad;
    current.orders += 1;
  }

  return [...byProduct.values()].sort((a, b) => {
    if (a.quantity !== b.quantity) return b.quantity - a.quantity;
    return a.product.localeCompare(b.product);
  });
}

function findRecipeProfile(productKey: string): PurchaseRecipeProfile | undefined {
  return DEFAULT_RECIPE_PROFILES.find((profile) =>
    profile.aliases.some((alias) => productKey.includes(normalizePhrase(alias)))
  );
}

function aggregateSuggestedPurchases(args: {
  rows: ParsedOrderRow[];
  assumptions: string[];
}): ScheduleDayPurchaseItem[] {
  const byItem = new Map<string, { item: string; unit: string; amount: number; sourceProducts: Set<string> }>();

  for (const row of args.rows) {
    const productKey = row._productKey || normalizePhrase(row.producto);
    const profile = findRecipeProfile(productKey);

    if (!profile) {
      const fallbackKey = "empaque_generico|pza";
      const fallback = byItem.get(fallbackKey) ?? {
        item: "empaque_generico",
        unit: "pza",
        amount: 0,
        sourceProducts: new Set<string>()
      };
      fallback.amount += row.cantidad;
      fallback.sourceProducts.add(row.producto);
      byItem.set(fallbackKey, fallback);

      args.assumptions.push(`producto \"${row.producto}\" sin receta mapeada; se sugiere empaque_generico`);
      continue;
    }

    for (const recipeItem of profile.items) {
      const key = `${recipeItem.item}|${recipeItem.unit}`;
      const current = byItem.get(key) ?? {
        item: recipeItem.item,
        unit: recipeItem.unit,
        amount: 0,
        sourceProducts: new Set<string>()
      };

      current.amount += recipeItem.perUnit * row.cantidad;
      current.sourceProducts.add(row.producto);
      byItem.set(key, current);
    }
  }

  return [...byItem.values()]
    .map((entry) => ({
      item: entry.item,
      unit: entry.unit,
      amount: Number(entry.amount.toFixed(2)),
      sourceProducts: [...entry.sourceProducts].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => {
      if (a.item !== b.item) return a.item.localeCompare(b.item);
      return a.unit.localeCompare(b.unit);
    });
}

function dedupeAssumptions(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export function createScheduleDayViewTool(config: ScheduleDayViewToolConfig = {}) {
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeGwsReadRange(config.gwsRange, "A:T") ?? "Pedidos!A:T";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function scheduleDayView(args: { chat_id: string; day: ScheduleDayFilter }): Promise<ScheduleDayViewResult> {
    if (!gwsSpreadsheetId) {
      throw new Error("schedule_day_view_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("schedule_day_view_gws_range_missing");
    }

    if (!dateFromDateKey(args.day.dateKey)) {
      throw new Error("schedule_day_view_day_invalid");
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
      errorPrefix: "schedule_day_view_gws",
      invalidPayloadError: "schedule_day_view_gws_invalid_payload",
      commandUnavailableError: "schedule_day_view_gws_command_unavailable",
      failedError: "schedule_day_view_gws_failed"
    });

    const assumptions: string[] = [];
    const parsedRows = mapRows(readResult.rows, timezone, assumptions);
    const filtered = parsedRows
      .filter((row) => row._dateKey === args.day.dateKey)
      .filter((row) => !row._isCanceled)
      .sort(sortRows);

    const deliveries = filtered.map(({ _dateKey: _ignoredDate, _productKey: _ignoredProduct, _isCanceled: _ignoredCanceled, ...row }) => row);
    const preparation = aggregatePreparation(filtered);
    const suggestedPurchases = aggregateSuggestedPurchases({
      rows: filtered,
      assumptions
    });

    return {
      day: args.day,
      timezone,
      totalOrders: deliveries.length,
      deliveries,
      preparation,
      suggestedPurchases,
      assumptions: dedupeAssumptions(assumptions),
      detail: `schedule-day-view executed (provider=gws, attempt=${readResult.attempt}, day=${args.day.dateKey})`
    };
  };
}

export const scheduleDayViewTool = createScheduleDayViewTool();
