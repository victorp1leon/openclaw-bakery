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
  cantidad_invalida?: boolean;
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
  source: "catalog" | "inline" | "fallback_generic";
};

export type ScheduleDayInconsistencyItem = {
  reference: string;
  reason: "delivery_iso_missing_or_invalid" | "quantity_invalid";
  affects: "day_schedule" | "preparation_and_purchases";
  detail: string;
};

export type ScheduleDayViewResult = {
  day: ScheduleDayFilter;
  timezone: string;
  trace_ref: string;
  totalOrders: number;
  deliveries: ScheduleDayDeliveryItem[];
  preparation: ScheduleDayPreparationItem[];
  suggestedPurchases: ScheduleDayPurchaseItem[];
  inconsistencies: ScheduleDayInconsistencyItem[];
  assumptions: string[];
  detail: string;
};

export type ScheduleDayRecipeSource = "inline" | "gws";

export type ScheduleDayViewToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  recipeSource?: ScheduleDayRecipeSource;
  recipeProfiles?: RecipeProfile[];
  recipesGwsCommand?: string;
  recipesGwsCommandArgs?: string[];
  recipesGwsSpreadsheetId?: string;
  recipesGwsRange?: string;
  recipesTimeoutMs?: number;
  recipesMaxRetries?: number;
  recipesRetryBackoffMs?: number;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = ScheduleDayDeliveryItem & {
  _isoDateKey?: string;
  _productKey: string;
  _isCanceled: boolean;
  _quantityValid: boolean;
  _reference: string;
};

type RecipeItem = {
  item: string;
  unit: string;
  perUnit: number;
};

type RecipeProfile = {
  id: string;
  aliases: string[];
  items: RecipeItem[];
};

type SuggestionBuildResult = {
  items: ScheduleDayPurchaseItem[];
  assumptions: string[];
  catalogMatches: number;
  inlineMatches: number;
};

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const DEFAULT_RECIPE_PROFILES: RecipeProfile[] = [
  {
    id: "cupcake",
    aliases: ["cupcake", "cupcakes"],
    items: [
      { item: "harina", unit: "g", perUnit: 45 },
      { item: "azucar", unit: "g", perUnit: 35 },
      { item: "mantequilla", unit: "g", perUnit: 28 },
      { item: "huevo", unit: "pza", perUnit: 0.8 }
    ]
  },
  {
    id: "pastel",
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
    id: "galleta",
    aliases: ["galleta", "galletas", "cookie", "cookies"],
    items: [
      { item: "harina", unit: "g", perUnit: 30 },
      { item: "azucar", unit: "g", perUnit: 18 },
      { item: "mantequilla", unit: "g", perUnit: 14 }
    ]
  },
  {
    id: "brownie",
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
    id: "dona",
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

function toDateKeyFromDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function extractDateKeyFromIso(value: string | undefined, timezone: string): string | undefined {
  const raw = value?.trim() ?? "";
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return toDateKeyFromDate(new Date(parsed), timezone);
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("fecha_hora_entrega") && normalized.includes("nombre_cliente");
}

function isRecipeHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("recipe_id") && normalized.includes("insumo");
}

function parseRecipeActive(value: string | undefined): boolean {
  const normalized = normalizeForMatch(value ?? "");
  if (!normalized) return true;
  if (["0", "false", "no", "inactivo", "off"].includes(normalized)) return false;
  return true;
}

function parseRecipeAliases(recipeId: string, aliasesCsv: string): string[] {
  const items = [recipeId, ...aliasesCsv.split(/[;,]/g)]
    .map((value) => normalizePhrase(value))
    .filter((value) => value.length > 0);
  return [...new Set(items)];
}

function parseRecipeProfiles(rows: string[][]): { profiles: RecipeProfile[]; assumptions: string[] } {
  const assumptions: string[] = [];
  const dataRows = rows.length > 0 && isRecipeHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const byRecipe = new Map<string, { id: string; aliases: Set<string>; items: Map<string, RecipeItem> }>();

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNo = i + 1;
    const rawRecipeId = row[0]?.trim() ?? "";
    const rawAliases = row[1]?.trim() ?? "";
    const rawItem = row[2]?.trim() ?? "";
    const rawUnit = normalizeForMatch(row[3] ?? "").replace(/\s+/g, "");
    const rawPerUnit = toNumberMaybe(row[4]);
    const active = parseRecipeActive(row[5]);

    if (!active) continue;
    if (!rawItem || !rawUnit || rawPerUnit == null || rawPerUnit <= 0) {
      assumptions.push(`fila receta ${rowNo} ignorada por campos invalidos`);
      continue;
    }

    const aliases = parseRecipeAliases(rawRecipeId, rawAliases);
    if (aliases.length === 0) {
      assumptions.push(`fila receta ${rowNo} ignorada por aliases vacios`);
      continue;
    }

    const recipeId = normalizePhrase(rawRecipeId || aliases[0]).replace(/\s+/g, "_");
    if (!recipeId) {
      assumptions.push(`fila receta ${rowNo} ignorada por recipe_id invalido`);
      continue;
    }

    if (!byRecipe.has(recipeId)) {
      byRecipe.set(recipeId, {
        id: recipeId,
        aliases: new Set<string>(),
        items: new Map<string, RecipeItem>()
      });
    }

    const recipe = byRecipe.get(recipeId)!;
    aliases.forEach((alias) => recipe.aliases.add(alias));

    const itemKey = `${normalizePhrase(rawItem)}|${rawUnit}`;
    if (!recipe.items.has(itemKey)) {
      recipe.items.set(itemKey, { item: rawItem, unit: rawUnit, perUnit: 0 });
    }
    const item = recipe.items.get(itemKey)!;
    item.perUnit += rawPerUnit;
  }

  const profiles = [...byRecipe.values()]
    .map((recipe) => ({
      id: recipe.id,
      aliases: [...recipe.aliases],
      items: [...recipe.items.values()]
    }))
    .filter((recipe) => recipe.aliases.length > 0 && recipe.items.length > 0);

  return { profiles, assumptions };
}

function isCanceledOrder(estadoPedido: string | undefined, notas: string | undefined): boolean {
  if (normalizeForMatch(estadoPedido ?? "") === "cancelado") {
    return true;
  }

  const notes = normalizeForMatch(notas ?? "");
  return /\bcancelado\b/.test(notes);
}

function mapRows(rows: string[][], timezone: string): { rows: ParsedOrderRow[]; totalRows: number } {
  const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows;

  const parsed = dataRows
    .map((row) => {
      const fecha_hora_entrega = row[2] ?? "";
      const fecha_hora_entrega_iso = row[18] || undefined;
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
      const quantityValid = rawCantidad != null && rawCantidad > 0;
      const cantidad = quantityValid ? Math.trunc(rawCantidad!) : 0;
      const reference = folio || operation_id || `row-${normalizePhrase(nombre_cliente || producto || "sin_ref") || "unknown"}`;

      return {
        folio,
        operation_id,
        fecha_hora_entrega,
        fecha_hora_entrega_iso,
        nombre_cliente,
        producto,
        cantidad,
        cantidad_invalida: !quantityValid ? true : undefined,
        tipo_envio,
        estado_pago,
        total,
        moneda,
        estado_pedido,
        _isoDateKey: extractDateKeyFromIso(fecha_hora_entrega_iso, timezone),
        _productKey: normalizePhrase(producto),
        _isCanceled: isCanceledOrder(estado_pedido, notas),
        _quantityValid: quantityValid,
        _reference: reference
      };
    })
    .filter((row) => row.fecha_hora_entrega && row.producto);

  return {
    rows: parsed,
    totalRows: dataRows.length
  };
}

function sortRows(a: ParsedOrderRow, b: ParsedOrderRow): number {
  const keyA = a._isoDateKey ?? "9999-12-31";
  const keyB = b._isoDateKey ?? "9999-12-31";
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  const dateCmp = (a.fecha_hora_entrega_iso ?? a.fecha_hora_entrega).localeCompare(b.fecha_hora_entrega_iso ?? b.fecha_hora_entrega);
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

function tokenize(value: string): string[] {
  return normalizePhrase(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function findRecipeProfile(productName: string, recipeProfiles: RecipeProfile[]): RecipeProfile | undefined {
  const normalized = normalizePhrase(productName);
  if (!normalized) return undefined;
  const productTokens = new Set(tokenize(normalized));

  let best: { profile: RecipeProfile; score: number } | undefined;

  for (const profile of recipeProfiles) {
    const score = profile.aliases.reduce((acc, alias) => {
      const aliasPhrase = normalizePhrase(alias);
      if (!aliasPhrase) return acc;
      if (aliasPhrase === normalized) return acc + 6;

      const aliasTokens = tokenize(aliasPhrase).filter((token) => token.length >= 3);
      if (aliasTokens.length === 0) return acc;

      if (aliasTokens.every((token) => productTokens.has(token))) {
        return acc + 4;
      }

      const matched = aliasTokens.filter((token) => productTokens.has(token)).length;
      return acc + matched;
    }, 0);

    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { profile, score };
    }
  }

  return best?.profile;
}

function roundAmount(amount: number, unit: string): number {
  if (unit === "pza") return Math.ceil(amount * 100) / 100;
  if (unit === "g" || unit === "ml") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

function buildSuggestedPurchases(args: {
  preparationRows: ParsedOrderRow[];
  catalogProfiles: RecipeProfile[];
  inlineProfiles: RecipeProfile[];
}): SuggestionBuildResult {
  const assumptions: string[] = [];
  const suppliesMap = new Map<string, { item: string; unit: string; amount: number; sourceProducts: Set<string>; source: "catalog" | "inline" | "fallback_generic" }>();

  let catalogMatches = 0;
  let inlineMatches = 0;

  for (const row of args.preparationRows) {
    const catalogRecipe = findRecipeProfile(row.producto, args.catalogProfiles);
    const inlineRecipe = findRecipeProfile(row.producto, args.inlineProfiles);

    const recipe = catalogRecipe ?? inlineRecipe;
    const source: "catalog" | "inline" | "fallback_generic" = catalogRecipe ? "catalog" : inlineRecipe ? "inline" : "fallback_generic";

    if (!recipe) {
      assumptions.push(`producto \"${row.producto}\" sin receta mapeada; se sugiere empaque_generico`);
      const fallbackKey = "empaque_generico|pza";
      if (!suppliesMap.has(fallbackKey)) {
        suppliesMap.set(fallbackKey, {
          item: "empaque_generico",
          unit: "pza",
          amount: 0,
          sourceProducts: new Set<string>(),
          source: "fallback_generic"
        });
      }
      const supply = suppliesMap.get(fallbackKey)!;
      supply.amount += row.cantidad;
      supply.sourceProducts.add(row.producto);
      continue;
    }

    if (source === "catalog") {
      catalogMatches += 1;
    } else {
      inlineMatches += 1;
      assumptions.push(`producto \"${row.producto}\" sin receta en catalogo; se aplico fallback inline`);
    }

    for (const item of recipe.items) {
      const key = `${normalizePhrase(item.item)}|${item.unit}|${source}`;
      if (!suppliesMap.has(key)) {
        suppliesMap.set(key, {
          item: item.item,
          unit: item.unit,
          amount: 0,
          sourceProducts: new Set<string>(),
          source
        });
      }
      const supply = suppliesMap.get(key)!;
      supply.amount += item.perUnit * row.cantidad;
      supply.sourceProducts.add(row.producto);
    }
  }

  const items = [...suppliesMap.values()]
    .map((entry) => ({
      item: entry.item,
      unit: entry.unit,
      amount: roundAmount(entry.amount, entry.unit),
      sourceProducts: [...entry.sourceProducts].sort((a, b) => a.localeCompare(b)),
      source: entry.source
    }))
    .sort((a, b) => a.item.localeCompare(b.item) || a.unit.localeCompare(b.unit));

  return {
    items,
    assumptions,
    catalogMatches,
    inlineMatches
  };
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

function dedupeInconsistencies(values: ScheduleDayInconsistencyItem[]): ScheduleDayInconsistencyItem[] {
  const seen = new Set<string>();
  const out: ScheduleDayInconsistencyItem[] = [];

  for (const value of values) {
    const key = `${value.reference}|${value.reason}|${value.affects}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

function buildTraceRef(args: { day: ScheduleDayFilter; attempt: number }): string {
  return `schedule-day-view:${args.day.dateKey}:a${args.attempt}`;
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
  const recipeSource = config.recipeSource ?? "inline";
  const inlineRecipeProfiles = config.recipeProfiles ?? DEFAULT_RECIPE_PROFILES;
  const recipesGwsCommand = config.recipesGwsCommand?.trim() || gwsCommand;
  const recipesGwsCommandArgs = config.recipesGwsCommandArgs ?? gwsCommandArgs;
  const recipesGwsSpreadsheetId = config.recipesGwsSpreadsheetId?.trim() || gwsSpreadsheetId;
  const recipesNormalizedRange = normalizeGwsReadRange(config.recipesGwsRange, "A:F") ?? "CatalogoRecetas!A:F";
  const recipesTimeoutMs = Number.isFinite(config.recipesTimeoutMs) && (config.recipesTimeoutMs ?? 0) > 0
    ? Math.trunc(config.recipesTimeoutMs!)
    : timeoutMs;
  const recipesMaxRetries = Number.isFinite(config.recipesMaxRetries) && (config.recipesMaxRetries ?? -1) >= 0
    ? Math.trunc(config.recipesMaxRetries!)
    : maxRetries;
  const recipesRetryBackoffMs = Number.isFinite(config.recipesRetryBackoffMs) && (config.recipesRetryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.recipesRetryBackoffMs!)
    : retryBackoffMs;
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

    let catalogProfiles: RecipeProfile[] = [];
    const assumptions: string[] = [];

    if (recipeSource === "gws") {
      if (!recipesGwsSpreadsheetId) {
        throw new Error("schedule_day_view_recipes_gws_spreadsheet_id_missing");
      }
      if (!recipesNormalizedRange) {
        throw new Error("schedule_day_view_recipes_gws_range_missing");
      }

      const recipesReadResult = await readGwsValuesWithRetries({
        command: recipesGwsCommand,
        commandArgs: recipesGwsCommandArgs,
        spreadsheetId: recipesGwsSpreadsheetId,
        range: recipesNormalizedRange,
        timeoutMs: recipesTimeoutMs,
        maxRetries: recipesMaxRetries,
        retryBackoffMs: recipesRetryBackoffMs,
        runner: gwsRunner,
        errorPrefix: "schedule_day_view_recipes_gws",
        invalidPayloadError: "schedule_day_view_recipes_gws_invalid_payload",
        commandUnavailableError: "schedule_day_view_recipes_gws_command_unavailable",
        failedError: "schedule_day_view_recipes_gws_failed"
      });

      const parsedRecipes = parseRecipeProfiles(recipesReadResult.rows);
      assumptions.push(...parsedRecipes.assumptions);
      if (parsedRecipes.profiles.length === 0) {
        throw new Error("schedule_day_view_recipes_catalog_empty");
      }
      catalogProfiles = parsedRecipes.profiles;
    }

    const mapped = mapRows(readResult.rows, timezone);
    const activeRows = mapped.rows.filter((row) => !row._isCanceled);

    const inconsistencies: ScheduleDayInconsistencyItem[] = [];

    for (const row of activeRows) {
      if (!row._isoDateKey) {
        inconsistencies.push({
          reference: row._reference,
          reason: "delivery_iso_missing_or_invalid",
          affects: "day_schedule",
          detail: "pedido activo excluido por fecha_hora_entrega_iso faltante o invalida"
        });
        continue;
      }

      if (row._isoDateKey === args.day.dateKey && !row._quantityValid) {
        inconsistencies.push({
          reference: row._reference,
          reason: "quantity_invalid",
          affects: "preparation_and_purchases",
          detail: "pedido incluido en entregas pero excluido de preparacion/compras por cantidad invalida"
        });
      }
    }

    const dayRows = activeRows
      .filter((row) => row._isoDateKey === args.day.dateKey)
      .sort(sortRows);

    const deliveries = dayRows.map(({ _isoDateKey: _ignoredDate, _productKey: _ignoredProduct, _isCanceled: _ignoredCanceled, _quantityValid: _ignoredQuantity, _reference: _ignoredReference, ...row }) => row);

    const preparationRows = dayRows.filter((row) => row._quantityValid);
    const preparation = aggregatePreparation(preparationRows);

    const suggestions = buildSuggestedPurchases({
      preparationRows,
      catalogProfiles,
      inlineProfiles: inlineRecipeProfiles
    });

    const traceRef = buildTraceRef({ day: args.day, attempt: readResult.attempt });
    const allAssumptions = dedupeAssumptions([...assumptions, ...suggestions.assumptions]);
    const allInconsistencies = dedupeInconsistencies(inconsistencies);

    return {
      day: args.day,
      timezone,
      trace_ref: traceRef,
      totalOrders: deliveries.length,
      deliveries,
      preparation,
      suggestedPurchases: suggestions.items,
      inconsistencies: allInconsistencies,
      assumptions: allAssumptions,
      detail: `schedule-day-view executed (provider=gws, attempt=${readResult.attempt}, day=${args.day.dateKey}, total_rows=${mapped.totalRows}, invalid_rows=${allInconsistencies.length}, recipe_source=${recipeSource}, catalog_matches=${suggestions.catalogMatches}, fallback_matches=${suggestions.inlineMatches})`
    };
  };
}

export const scheduleDayViewTool = createScheduleDayViewTool();
