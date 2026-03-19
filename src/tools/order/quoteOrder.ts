import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

type ShippingMode = "envio_domicilio" | "recoger_en_tienda" | "sin_definir";

export type QuoteOrderLine = {
  kind: "base" | "option" | "extra" | "shipping" | "urgency";
  key: string;
  label: string;
  amount: number;
};

export type QuoteCustomizationField = "quote_sabor_pan" | "quote_sabor_relleno" | "quote_tipo_betun" | "quote_topping";

export type QuoteOptionSuggestions = Partial<Record<QuoteCustomizationField, string[]>>;

export type QuoteOrderResult = {
  query: string;
  currency: string;
  quantity: number;
  shippingMode: ShippingMode;
  product: {
    key: string;
    name: string;
    unitAmount: number;
  };
  lines: QuoteOrderLine[];
  subtotal: number;
  total: number;
  suggestedDeposit?: number;
  quoteValidityHours?: number;
  assumptions: string[];
  optionSuggestions?: QuoteOptionSuggestions;
  referenceContext?: {
    matched: number;
    averagePrice?: number;
  };
  detail: string;
};

export type QuoteOrderToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  preciosRange?: string;
  opcionesRange?: string;
  referenciasRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  currency?: string;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type PricingRow = {
  type: string;
  key: string;
  name: string;
  amount: number;
  mode?: string;
  appliesTo?: string;
  minQty?: number;
  maxQty?: number;
  maxLeadHours?: number;
  zone?: string;
  active: boolean;
};

type OptionRow = {
  category?: string;
  key: string;
  name: string;
  amount: number;
  mode?: string;
  appliesTo?: string;
  active: boolean;
};

type ReferenceRow = {
  item: string;
  price?: number;
};

type QuoteOrderError = Error & { retriable: boolean };

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "sin",
  "para",
  "por",
  "en",
  "y",
  "o",
  "a",
  "al",
  "un",
  "una",
  "que",
  "pedido",
  "cotiza",
  "cotizar",
  "cotizacion"
]);
const MODIFIER_MATCH_HIGH_CONFIDENCE = 8;
const MODIFIER_MATCH_AMBIGUOUS_MIN = 4;
const SHIPPING_ZONE_MATCH_MIN = 3;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeHeader(value: string): string {
  return normalizeForMatch(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizePhrase(value: string | undefined): string {
  if (!value) return "";
  return normalizeForMatch(value).replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizePhrase(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function keywordTokens(args: { key?: string; name?: string }): string[] {
  const out = [...tokenize(args.key ?? ""), ...tokenize(args.name ?? "")]
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  return [...new Set(out)];
}

function parseJsonText(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
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

function makeQuoteError(message: string, retriable = false): QuoteOrderError {
  const err = new Error(message) as QuoteOrderError;
  err.retriable = retriable;
  return err;
}

function toNumberMaybe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  let normalized = raw
    .replace(/[^\d,.\-+]/g, "")
    .replace(/(?!^)[+-]/g, "");
  if (!normalized) return undefined;

  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;
  if (commaCount > 0 && dotCount > 0) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    normalized = commaCount > 1
      ? normalized.replace(/,/g, "")
      : normalized.replace(",", ".");
  } else if (dotCount > 1) {
    normalized = normalized.replace(/\./g, "");
  }

  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPositiveIntMaybe(value: string | undefined): number | undefined {
  const parsed = toNumberMaybe(value);
  if (parsed == null) return undefined;
  if (parsed <= 0) return undefined;
  return Math.trunc(parsed);
}

function isActive(value: string | undefined): boolean {
  if (!value || value.trim().length === 0) return true;
  const normalized = normalizeForMatch(value);
  return ["1", "true", "si", "sí", "yes", "activo", "activa", "x"].includes(normalized);
}

function headerIndexMap(row: string[]): Map<string, number> {
  const map = new Map<string, number>();
  row.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (!key) return;
    if (!map.has(key)) map.set(key, index);
  });
  return map;
}

function hasAllHeaders(row: string[], headers: string[]): boolean {
  const map = headerIndexMap(row);
  return headers.every((header) => map.has(header));
}

function readCell(args: {
  row: string[];
  header: Map<string, number>;
  key: string;
  fallbackIndex: number;
}): string {
  const index = args.header.get(args.key) ?? args.fallbackIndex;
  return (args.row[index] ?? "").trim();
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

function parsePricingRows(rows: string[][]): PricingRow[] {
  if (rows.length === 0) return [];
  const header = hasAllHeaders(rows[0], ["tipo", "clave", "nombre"]) ? headerIndexMap(rows[0]) : new Map<string, number>();
  const dataRows = header.size > 0 ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const amount = toNumberMaybe(readCell({ row, header, key: "monto_mxn", fallbackIndex: 3 }));
      return {
        type: normalizeForMatch(readCell({ row, header, key: "tipo", fallbackIndex: 0 })),
        key: readCell({ row, header, key: "clave", fallbackIndex: 1 }),
        name: readCell({ row, header, key: "nombre", fallbackIndex: 2 }),
        amount: amount ?? 0,
        mode: readCell({ row, header, key: "modo_calculo", fallbackIndex: 4 }) || undefined,
        appliesTo: readCell({ row, header, key: "aplica_a", fallbackIndex: 5 }) || undefined,
        minQty: toPositiveIntMaybe(readCell({ row, header, key: "cantidad_min", fallbackIndex: 6 })),
        maxQty: toPositiveIntMaybe(readCell({ row, header, key: "cantidad_max", fallbackIndex: 7 })),
        maxLeadHours: toPositiveIntMaybe(readCell({ row, header, key: "horas_max_anticipacion", fallbackIndex: 8 })),
        zone: readCell({ row, header, key: "zona", fallbackIndex: 9 }) || undefined,
        active: isActive(readCell({ row, header, key: "activo", fallbackIndex: 10 }))
      } satisfies PricingRow;
    })
    .filter((row) => row.active && row.key && row.name && Number.isFinite(row.amount) && row.amount >= 0);
}

function parseOptionRows(rows: string[][]): OptionRow[] {
  if (rows.length === 0) return [];
  const header = hasAllHeaders(rows[0], ["categoria", "clave", "nombre"]) ? headerIndexMap(rows[0]) : new Map<string, number>();
  const dataRows = header.size > 0 ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const amount = toNumberMaybe(readCell({ row, header, key: "precio_extra_mxn", fallbackIndex: 3 }));
      return {
        category: readCell({ row, header, key: "categoria", fallbackIndex: 0 }) || undefined,
        key: readCell({ row, header, key: "clave", fallbackIndex: 1 }),
        name: readCell({ row, header, key: "nombre", fallbackIndex: 2 }),
        amount: amount ?? 0,
        mode: readCell({ row, header, key: "modo_calculo", fallbackIndex: 4 }) || undefined,
        appliesTo: readCell({ row, header, key: "aplica_a", fallbackIndex: 5 }) || undefined,
        active: isActive(readCell({ row, header, key: "activo", fallbackIndex: 6 }))
      } satisfies OptionRow;
    })
    .filter((row) => row.active && row.key && row.name && Number.isFinite(row.amount) && row.amount >= 0);
}

function parseReferenceRows(rows: string[][]): ReferenceRow[] {
  if (rows.length === 0) return [];
  const header = hasAllHeaders(rows[0], ["item"]) ? headerIndexMap(rows[0]) : new Map<string, number>();
  const dataRows = header.size > 0 ? rows.slice(1) : rows;

  return dataRows
    .map((row) => ({
      item: readCell({ row, header, key: "item", fallbackIndex: 2 }),
      price: toNumberMaybe(readCell({ row, header, key: "precio_mxn", fallbackIndex: 3 }))
    }))
    .filter((row) => row.item.length > 0);
}

function normalizeReadRange(value: string | undefined, fallback: string): string {
  const range = value?.trim();
  if (!range) return fallback;
  if (range.includes("!")) return range;
  return `${range}!A:Z`;
}

function detectQuantity(query: string): { value: number; explicit: boolean } {
  const normalized = normalizeForMatch(query);
  const byWord =
    normalized.match(/\b(?:cantidad|piezas?|pzs?|unidades?)\s*(?:de|x|:|=)?\s*(\d{1,3})\b/)?.[1] ??
    normalized.match(/\b(\d{1,3})\s*(?:piezas?|pzs?|cupcakes?|galletas?|pasteles?|donas?)\b/)?.[1] ??
    normalized.match(/\bx\s*(\d{1,3})\b/)?.[1];

  if (!byWord) return { value: 1, explicit: false };

  const parsed = Number(byWord);
  if (!Number.isInteger(parsed) || parsed <= 0) return { value: 1, explicit: false };
  return { value: parsed, explicit: true };
}

function detectShippingMode(query: string): ShippingMode {
  const normalized = normalizeForMatch(query);
  const hasPickup = /\b(recoger|recoge|retiro|en tienda|paso por)\b/.test(normalized);
  const hasDelivery = /\b(envio|enviar|domicilio|a domicilio|entrega)\b/.test(normalized);

  if (hasPickup && !hasDelivery) return "recoger_en_tienda";
  if (hasDelivery) return "envio_domicilio";
  if (hasPickup) return "recoger_en_tienda";
  return "sin_definir";
}

function scoreMatch(args: { query: string; key?: string; name?: string }): number {
  const query = args.query;
  const keyPhrase = normalizePhrase(args.key);
  const namePhrase = normalizePhrase(args.name);
  const tokens = keywordTokens({ key: args.key, name: args.name });
  let score = 0;

  if (keyPhrase && query.includes(keyPhrase)) score += 8;
  if (namePhrase && query.includes(namePhrase)) score += 6;

  let tokenMatches = 0;
  for (const token of tokens) {
    if (query.includes(token)) {
      tokenMatches += 1;
      score += 1;
    }
  }

  if (tokens.length > 0 && tokenMatches === tokens.length) {
    score += 2;
  }

  return score;
}

function isQuantityInRange(args: { quantity: number; minQty?: number; maxQty?: number }): boolean {
  if (args.minQty != null && args.quantity < args.minQty) return false;
  if (args.maxQty != null && args.quantity > args.maxQty) return false;
  return true;
}

function calcAmountByMode(args: {
  amount: number;
  mode?: string;
  quantity: number;
  baseAmount: number;
  subtotalBefore: number;
}): number {
  const mode = normalizeForMatch(args.mode ?? "");
  if (["porcentaje", "percent", "porcentaje_sobre_base"].includes(mode)) {
    return (args.subtotalBefore * args.amount) / 100;
  }
  if (["por_unidad", "por_pieza", "unidad", "pieza", "unitario"].includes(mode)) {
    return args.amount * args.quantity;
  }
  if (["porcentaje_subtotal", "porcentaje_sobre_subtotal"].includes(mode)) {
    return (args.subtotalBefore * args.amount) / 100;
  }
  return args.amount;
}

function resolveBaseAmount(args: { row: PricingRow; quantity: number }): number {
  const mode = normalizeForMatch(args.row.mode ?? "");
  if (["por_unidad", "por_pieza", "unidad", "pieza", "unitario"].includes(mode)) {
    return args.row.amount * args.quantity;
  }

  if (args.quantity > 1) {
    const hint = normalizeForMatch(`${args.row.key} ${args.row.name}`);
    if (/\b(pieza|cupcake|galleta|dona|individual|unitario)\b/.test(hint)) {
      return args.row.amount * args.quantity;
    }
  }

  return args.row.amount;
}

function isAppliesToProduct(appliesTo: string | undefined, product: PricingRow): boolean {
  if (!appliesTo || appliesTo.trim().length === 0) return true;

  const normalized = normalizeForMatch(appliesTo);
  if (["todo", "pedido", "general", "cotizacion", "cotización"].includes(normalized)) return true;

  const productPhrase = normalizePhrase(`${product.key} ${product.name}`);
  const appliesPhrase = normalizePhrase(appliesTo);
  if (productPhrase && appliesPhrase && productPhrase.includes(appliesPhrase)) return true;

  const normalizeToken = (token: string): string =>
    token
      .replace(/es$/i, "")
      .replace(/s$/i, "")
      .trim();

  const productTokens = keywordTokens({ key: product.key, name: product.name }).map(normalizeToken);
  const appliesTokens = keywordTokens({ key: appliesTo }).map(normalizeToken);

  return appliesTokens.some((token) => {
    if (!token) return false;
    if (productTokens.includes(token)) return true;
    return productTokens.some((productToken) => productToken.includes(token) || token.includes(productToken));
  });
}

function detectSuggestionFieldFromCategory(value: string | undefined): QuoteCustomizationField | undefined {
  const category = normalizePhrase(value);
  if (!category) return undefined;

  if (/\brelleno\b/.test(category)) return "quote_sabor_relleno";
  if (/\b(betun|frosting|cobertura|icing)\b/.test(category)) return "quote_tipo_betun";
  if (/\b(topping|topper)\b/.test(category)) return "quote_topping";
  if (/\b(pan|bizcocho|masa)\b/.test(category)) return "quote_sabor_pan";
  return undefined;
}

function detectSuggestionFieldFromText(value: string): QuoteCustomizationField | undefined {
  const text = normalizePhrase(value);
  if (!text) return undefined;

  if (/\brelleno\b/.test(text)) return "quote_sabor_relleno";
  if (/\b(betun|buttercream|chantilly|merengue|ganache|frosting|cobertura|icing)\b/.test(text)) {
    return "quote_tipo_betun";
  }
  if (/\b(topping|topper|sprinkles|chispas)\b/.test(text)) return "quote_topping";
  if (/\b(sabor pan|sabor de pan|pan|bizcocho|masa)\b/.test(text)) return "quote_sabor_pan";
  return undefined;
}

function collectOptionSuggestions(args: { options: OptionRow[]; product: PricingRow }): QuoteOptionSuggestions | undefined {
  const buckets: Record<QuoteCustomizationField, string[]> = {
    quote_sabor_pan: [],
    quote_sabor_relleno: [],
    quote_tipo_betun: [],
    quote_topping: []
  };
  const seenByField = new Map<QuoteCustomizationField, Set<string>>();

  for (const option of args.options) {
    if (!isAppliesToProduct(option.appliesTo, args.product)) continue;

    const field =
      detectSuggestionFieldFromCategory(option.category) ??
      detectSuggestionFieldFromText(`${option.key} ${option.name}`);
    if (!field) continue;

    const label = option.name.trim() || option.key.trim();
    if (!label) continue;

    const normalizedLabel = normalizeForMatch(label);
    const seen = seenByField.get(field) ?? new Set<string>();
    if (seen.has(normalizedLabel)) continue;
    seen.add(normalizedLabel);
    seenByField.set(field, seen);

    buckets[field].push(label);
  }

  const out: QuoteOptionSuggestions = {};
  const fields: QuoteCustomizationField[] = ["quote_sabor_pan", "quote_sabor_relleno", "quote_tipo_betun", "quote_topping"];
  for (const field of fields) {
    if (buckets[field].length > 0) {
      out[field] = buckets[field];
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function findBestProduct(args: { query: string; quantity: number; rows: PricingRow[] }): PricingRow | undefined {
  const products = args.rows.filter((row) => row.type === "producto");
  if (products.length === 0) return undefined;

  const ranked = products
    .map((row) => {
      const score = scoreMatch({ query: args.query, key: row.key, name: row.name });
      const inRange = isQuantityInRange({
        quantity: args.quantity,
        minQty: row.minQty,
        maxQty: row.maxQty
      });
      return { row, score: inRange ? score : score - 2 };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.row;
}

function matchModifier(args: { query: string; key: string; name: string }): boolean {
  const keyPhrase = normalizePhrase(args.key);
  const namePhrase = normalizePhrase(args.name);
  if (keyPhrase && args.query.includes(keyPhrase)) return true;
  if (namePhrase && args.query.includes(namePhrase)) return true;

  const tokens = keywordTokens({ key: args.key, name: args.name }).filter((token) => token.length >= 4);
  if (tokens.length === 0) return false;

  const matched = tokens.filter((token) => args.query.includes(token)).length;
  if (tokens.length === 1) return matched === 1 && tokens[0].length >= 6;
  return matched >= Math.min(2, tokens.length);
}

function hasNoExtraModifierPreference(query: string): boolean {
  return /\b(sin\s+(?:extra|extras|adicional|adicionales|opcion|opciones)|ningun(?:a|o)?\s+(?:extra|adicional))\b/.test(query);
}

function detectLeadHours(query: string): number | undefined {
  const normalized = normalizeForMatch(query);
  if (/\bhoy\b/.test(normalized)) return 12;
  if (/\bmanana\b/.test(normalized)) return 24;
  if (/\burgente\b/.test(normalized)) return 24;

  const explicit =
    normalized.match(/\b(?:en|para|dentro de)\s*(\d{1,3})\s*(?:h|hora|horas)\b/)?.[1] ??
    normalized.match(/\b(\d{1,3})\s*(?:h|hora|horas)\b/)?.[1];

  if (!explicit) return undefined;
  const parsed = Number(explicit);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.trunc(parsed);
}

function computeReferenceContext(args: { references: ReferenceRow[]; product: PricingRow }):
  | { matched: number; averagePrice?: number }
  | undefined {
  if (args.references.length === 0) return undefined;
  const productTokens = keywordTokens({ key: args.product.key, name: args.product.name }).filter((token) => token.length >= 4);
  if (productTokens.length === 0) return undefined;

  const matched = args.references.filter((row) => {
    const item = normalizePhrase(row.item);
    return productTokens.some((token) => item.includes(token));
  });

  if (matched.length === 0) return undefined;

  const prices = matched.map((row) => row.price).filter((value): value is number => value != null && Number.isFinite(value));
  const averagePrice = prices.length > 0 ? roundMoney(prices.reduce((acc, value) => acc + value, 0) / prices.length) : undefined;

  return {
    matched: matched.length,
    ...(averagePrice != null ? { averagePrice } : {})
  };
}

async function readRange(args: {
  command: string;
  commandArgs: string[];
  spreadsheetId: string;
  range: string;
  timeoutMs: number;
  gwsRunner: GwsCommandRunner;
}): Promise<string[][]> {
  let result;
  try {
    result = await args.gwsRunner({
      command: args.command,
      commandArgs: [
        ...args.commandArgs,
        "sheets",
        "spreadsheets",
        "values",
        "get",
        "--params",
        JSON.stringify({
          spreadsheetId: args.spreadsheetId,
          range: args.range
        })
      ],
      timeoutMs: args.timeoutMs
    });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
      throw makeQuoteError("quote_order_gws_command_unavailable");
    }
    if (classifyGwsSpawnError(err) === "network") {
      throw makeQuoteError("quote_order_gws_network_error", true);
    }
    throw makeQuoteError("quote_order_gws_spawn_failed");
  }

  const parsedStdout = parseJsonText(result.stdout);
  const parsedStderr = parseJsonText(result.stderr);
  const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);
  const values = readValuesFromGwsPayload(parsedStdout);

  if (!result.timedOut && result.exitCode === 0 && !errInfo) {
    if (!values) {
      throw makeQuoteError("quote_order_gws_invalid_payload");
    }
    return values;
  }

  const detail = errInfo?.message ?? result.stderr ?? `exit_${result.exitCode ?? "unknown"}`;
  const token = sanitizeErrorToken(detail);
  const retriable = isRetriableGwsFailure({
    timedOut: result.timedOut,
    code: errInfo?.code,
    stdout: result.stdout,
    stderr: result.stderr
  });
  throw makeQuoteError(`quote_order_gws_${token}`, retriable);
}

export function createQuoteOrderTool(config: QuoteOrderToolConfig = {}) {
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const preciosRange = normalizeReadRange(config.preciosRange, "CatalogoPrecios!A:Z");
  const opcionesRange = normalizeReadRange(config.opcionesRange, "CatalogoOpciones!A:Z");
  const referenciasRange = normalizeReadRange(config.referenciasRange, "CatalogoReferencias!A:Z");
  const timeoutMs = config.timeoutMs ?? 5000;
  const maxRetries = config.maxRetries ?? 2;
  const retryBackoffMs = config.retryBackoffMs ?? 250;
  const currency = config.currency?.trim() || "MXN";
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async (args: { chat_id: string; query: string }): Promise<QuoteOrderResult> => {
    if (!gwsSpreadsheetId) {
      throw makeQuoteError("quote_order_gws_spreadsheet_id_missing");
    }
    if (!args.query || args.query.trim().length < 3) {
      throw makeQuoteError("quote_order_query_invalid");
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        const [preciosRaw, opcionesRaw, referenciasRaw] = await Promise.all([
          readRange({
            command: gwsCommand,
            commandArgs: gwsCommandArgs,
            spreadsheetId: gwsSpreadsheetId,
            range: preciosRange,
            timeoutMs,
            gwsRunner
          }),
          readRange({
            command: gwsCommand,
            commandArgs: gwsCommandArgs,
            spreadsheetId: gwsSpreadsheetId,
            range: opcionesRange,
            timeoutMs,
            gwsRunner
          }),
          readRange({
            command: gwsCommand,
            commandArgs: gwsCommandArgs,
            spreadsheetId: gwsSpreadsheetId,
            range: referenciasRange,
            timeoutMs,
            gwsRunner
          })
        ]);

        const pricingRows = parsePricingRows(preciosRaw);
        const optionRows = parseOptionRows(opcionesRaw);
        const referenceRows = parseReferenceRows(referenciasRaw);

        if (pricingRows.length === 0) {
          throw makeQuoteError("quote_order_pricing_catalog_empty");
        }

        const normalizedQuery = normalizePhrase(args.query);
        const quantityInfo = detectQuantity(args.query);
        const product = findBestProduct({
          query: normalizedQuery,
          quantity: quantityInfo.value,
          rows: pricingRows
        });

        if (!product) {
          throw makeQuoteError("quote_order_product_not_found");
        }

        const assumptions: string[] = [];
        if (!quantityInfo.explicit) {
          assumptions.push("No se detectó cantidad explícita; se asumió 1 unidad.");
        }

        const baseAmount = roundMoney(resolveBaseAmount({ row: product, quantity: quantityInfo.value }));
        const lines: QuoteOrderLine[] = [
          {
            kind: "base",
            key: product.key,
            label: product.name,
            amount: baseAmount
          }
        ];

        let subtotal = baseAmount;

        const extraRows = pricingRows.filter((row) => row.type === "extra");
        const modifiers: Array<{ source: "option" | "extra"; row: OptionRow | PricingRow }> = [
          ...optionRows.map((row) => ({ source: "option" as const, row })),
          ...extraRows.map((row) => ({ source: "extra" as const, row }))
        ];

        const skipModifiers = hasNoExtraModifierPreference(normalizedQuery);
        const seenKeys = new Set<string>();
        const ambiguousModifierKeys = new Set<string>();
        for (const modifier of modifiers) {
          const row = modifier.row;
          const normalizedKey = normalizeForMatch(row.key);
          if (seenKeys.has(normalizedKey)) continue;
          if (!isAppliesToProduct(row.appliesTo, product)) continue;
          if (skipModifiers) continue;

          const likelyMatch = matchModifier({ query: normalizedQuery, key: row.key, name: row.name });
          if (!likelyMatch) continue;

          const score = scoreMatch({ query: normalizedQuery, key: row.key, name: row.name });
          if (score < MODIFIER_MATCH_AMBIGUOUS_MIN) continue;
          if (score < MODIFIER_MATCH_HIGH_CONFIDENCE) {
            ambiguousModifierKeys.add(normalizedKey);
            continue;
          }

          seenKeys.add(normalizedKey);
          const amount = roundMoney(
            calcAmountByMode({
              amount: row.amount,
              mode: row.mode,
              quantity: quantityInfo.value,
              baseAmount,
              subtotalBefore: subtotal
            })
          );
          if (amount <= 0) continue;

          lines.push({
            kind: modifier.source,
            key: row.key,
            label: row.name,
            amount
          });
          subtotal = roundMoney(subtotal + amount);
        }

        if (ambiguousModifierKeys.size > 0) {
          throw makeQuoteError("quote_order_modifier_ambiguous");
        }

        const shippingMode = detectShippingMode(args.query);
        if (shippingMode === "envio_domicilio") {
          const shippingRows = pricingRows.filter((row) => row.type === "envio");
          if (shippingRows.length > 0) {
            const rankedShipping = shippingRows
              .map((row) => ({
                row,
                score: scoreMatch({
                  query: normalizedQuery,
                  key: `${row.key} ${row.zone ?? ""}`,
                  name: `${row.name} ${row.zone ?? ""}`
                })
              }))
              .sort((a, b) => b.score - a.score);

            const strongCandidates = rankedShipping.filter((candidate) => candidate.score >= SHIPPING_ZONE_MATCH_MIN);
            if (strongCandidates.length === 0) {
              throw makeQuoteError("quote_order_shipping_zone_missing");
            }

            const topCandidate = strongCandidates[0];
            const secondCandidate = strongCandidates[1];
            if (topCandidate && secondCandidate && topCandidate.score === secondCandidate.score) {
              throw makeQuoteError("quote_order_shipping_zone_ambiguous");
            }

            const shipping = topCandidate?.row;

            if (shipping && shipping.amount > 0) {
              lines.push({
                kind: "shipping",
                key: shipping.key,
                label: shipping.name,
                amount: roundMoney(shipping.amount)
              });
              subtotal = roundMoney(subtotal + shipping.amount);
            }
          } else {
            assumptions.push("Se detectó envío a domicilio pero no hay reglas de envío activas en el catálogo.");
          }
        } else if (shippingMode === "sin_definir") {
          assumptions.push("No se detectó tipo de entrega; no se agregó costo de envío.");
        }

        const leadHours = detectLeadHours(args.query);
        const urgencyRows = pricingRows
          .filter((row) => row.type === "urgencia" && row.maxLeadHours != null)
          .sort((a, b) => (a.maxLeadHours ?? Number.MAX_SAFE_INTEGER) - (b.maxLeadHours ?? Number.MAX_SAFE_INTEGER));

        let urgencyAmount = 0;
        if (leadHours != null && urgencyRows.length > 0) {
          const urgency = urgencyRows.find((row) => leadHours <= (row.maxLeadHours ?? 0));
          if (urgency) {
            urgencyAmount = roundMoney(
              calcAmountByMode({
                amount: urgency.amount,
                mode: urgency.mode,
                quantity: quantityInfo.value,
                baseAmount,
                subtotalBefore: subtotal
              })
            );
            if (urgencyAmount > 0) {
              lines.push({
                kind: "urgency",
                key: urgency.key,
                label: urgency.name,
                amount: urgencyAmount
              });
            }
          }
        }

        const total = roundMoney(subtotal + urgencyAmount);

        const policyRows = pricingRows.filter((row) => row.type === "politica");
        const depositPolicy = policyRows.find((row) => normalizeForMatch(`${row.key} ${row.name}`).includes("anticipo"));
        const validityPolicy = policyRows.find((row) => normalizeForMatch(`${row.key} ${row.name}`).includes("vigencia"));

        let suggestedDeposit: number | undefined;
        if (depositPolicy) {
          const mode = normalizeForMatch(depositPolicy.mode ?? "");
          suggestedDeposit = mode === "porcentaje"
            ? roundMoney((total * depositPolicy.amount) / 100)
            : roundMoney(depositPolicy.amount);
        }

        let quoteValidityHours: number | undefined;
        if (validityPolicy) {
          quoteValidityHours = toPositiveIntMaybe(String(validityPolicy.amount));
        }

        const referenceContext = computeReferenceContext({
          references: referenceRows,
          product
        });
        const optionSuggestions = collectOptionSuggestions({
          options: optionRows,
          product
        });

        return {
          query: args.query,
          currency,
          quantity: quantityInfo.value,
          shippingMode,
          product: {
            key: product.key,
            name: product.name,
            unitAmount: roundMoney(product.amount)
          },
          lines,
          subtotal,
          total,
          ...(suggestedDeposit != null ? { suggestedDeposit } : {}),
          ...(quoteValidityHours != null ? { quoteValidityHours } : {}),
          assumptions,
          ...(optionSuggestions ? { optionSuggestions } : {}),
          ...(referenceContext ? { referenceContext } : {}),
          detail: `quote-order executed (provider=gws, attempt=${attempt}, ts=${now().toISOString()})`
        };
      } catch (err) {
        if (err instanceof Error && err.message === "quote_order_product_not_found") {
          throw err;
        }
        if (err instanceof Error && err.message.startsWith("quote_order_pricing_catalog")) {
          throw err;
        }

        const retriable = Boolean((err as Partial<QuoteOrderError>)?.retriable);
        if (!retriable) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt <= maxRetries) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }
        break;
      }
    }

    throw lastError ?? makeQuoteError("quote_order_gws_failed");
  };
}
