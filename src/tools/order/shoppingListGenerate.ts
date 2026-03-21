import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeGwsReadRange, readGwsValuesWithRetries } from "../googleWorkspace/gwsReadValues";

export type ShoppingListScope =
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
    type: "order_ref";
    reference: string;
    label: string;
  }
  | {
    type: "lookup";
    query: string;
    label: string;
  };

export type ShoppingListOrderItem = {
  folio: string;
  operation_id?: string;
  fecha_hora_entrega: string;
  fecha_hora_entrega_iso?: string;
  nombre_cliente: string;
  producto: string;
  cantidad: number;
};

export type ShoppingListProductItem = {
  product: string;
  quantity: number;
  orders: number;
};

export type ShoppingListSupplyItem = {
  item: string;
  unit: string;
  amount: number;
  sourceProducts: string[];
};

export type ShoppingListManualIntervention = {
  type: "missing_recipe" | "invalid_quantity";
  reference: string;
  product?: string;
  detail: string;
};

export type ShoppingListRecipeSource = "inline" | "gws";

export type ShoppingListResult = {
  scope: ShoppingListScope;
  timezone: string;
  totalOrders: number;
  orders: ShoppingListOrderItem[];
  products: ShoppingListProductItem[];
  supplies: ShoppingListSupplyItem[];
  manualIntervention?: ShoppingListManualIntervention[];
  assumptions: string[];
  detail: string;
};

export type ShoppingListToolConfig = {
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  limit?: number;
  recipeProfiles?: RecipeProfile[];
  recipeSource?: ShoppingListRecipeSource;
  recipesGwsCommand?: string;
  recipesGwsCommandArgs?: string[];
  recipesGwsSpreadsheetId?: string;
  recipesGwsRange?: string;
  recipesTimeoutMs?: number;
  recipesMaxRetries?: number;
  recipesRetryBackoffMs?: number;
  gwsRunner?: GwsCommandRunner;
};

type ParsedOrderRow = ShoppingListOrderItem & {
  _dateKey?: string;
  _matchKey: string;
  _productKey: string;
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

const DAY_MS = 86_400_000;

const DEFAULT_RECIPE_PROFILES: RecipeProfile[] = [
  {
    id: "cupcake",
    aliases: ["cupcake", "cupcakes"],
    items: [
      { item: "harina", unit: "g", perUnit: 45 },
      { item: "azucar", unit: "g", perUnit: 35 },
      { item: "mantequilla", unit: "g", perUnit: 28 },
      { item: "huevo", unit: "pza", perUnit: 0.8 },
      { item: "betun", unit: "g", perUnit: 25 }
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

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizePhrase(value: string): string {
  return normalizeForMatch(value).replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
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
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("fecha_hora_entrega") && normalized.includes("nombre_cliente");
}

function mapRows(rows: string[][], timezone: string, assumptions: string[]): {
  rows: ParsedOrderRow[];
  manualIntervention: ShoppingListManualIntervention[];
} {
  const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const manualIntervention: ShoppingListManualIntervention[] = [];

  const parsedRows = dataRows
    .map((row) => {
      const fecha_hora_entrega = row[2] ?? "";
      const fecha_hora_entrega_iso = row[18] || undefined;
      const dateSource = fecha_hora_entrega_iso || fecha_hora_entrega;
      const folio = row[1] ?? "";
      const operation_id = row[17] || undefined;
      const nombre_cliente = row[3] ?? "";
      const producto = row[5] ?? "";
      const rawQuantity = (row[7] ?? "").trim();
      const rawQty = toNumberMaybe(row[7]);
      const isValidQty = rawQty != null && Number.isInteger(rawQty) && rawQty > 0;
      const orderRef = folio || operation_id || producto || "sin_referencia";
      if (!isValidQty) {
        const quantityLabel = rawQuantity.length > 0 ? rawQuantity : "vacia";
        assumptions.push(`pedido ${orderRef} omitido por cantidad invalida (${quantityLabel})`);
        manualIntervention.push({
          type: "invalid_quantity",
          reference: orderRef,
          product: producto || undefined,
          detail: `Pedido omitido del calculo de insumos por cantidad invalida (${quantityLabel}).`
        });
        return undefined;
      }
      const searchKey = normalizeForMatch(`${folio} ${operation_id ?? ""} ${nombre_cliente} ${producto}`);

      return {
        folio,
        operation_id,
        fecha_hora_entrega,
        fecha_hora_entrega_iso,
        nombre_cliente,
        producto,
        cantidad: rawQty,
        _dateKey: extractDateKey(dateSource, timezone),
        _matchKey: searchKey,
        _productKey: normalizePhrase(producto)
      };
    })
    .filter((row): row is ParsedOrderRow => Boolean(row && row.fecha_hora_entrega && row.nombre_cliente && row.producto));

  return {
    rows: parsedRows,
    manualIntervention
  };
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
      assumptions.push(`fila receta ${rowNo} ignorada por campos inválidos`);
      continue;
    }

    const aliases = parseRecipeAliases(rawRecipeId, rawAliases);
    if (aliases.length === 0) {
      assumptions.push(`fila receta ${rowNo} ignorada por aliases vacíos`);
      continue;
    }

    const recipeId = normalizePhrase(rawRecipeId || aliases[0]).replace(/\s+/g, "_");
    if (!recipeId) {
      assumptions.push(`fila receta ${rowNo} ignorada por recipe_id inválido`);
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

  return {
    profiles,
    assumptions
  };
}

function matchesLookupQuery(row: ParsedOrderRow, query: string): boolean {
  const q = normalizeForMatch(query);
  if (!q || q.length < 2) return false;

  const folio = normalizeForMatch(row.folio);
  const operationId = normalizeForMatch(row.operation_id ?? "");
  if (folio === q || operationId === q) return true;

  const tokens = q.split(/\s+/).filter((token) => token.length >= 2);
  if (tokens.length === 0) return false;
  return tokens.every((token) => row._matchKey.includes(token));
}

function matchesScope(row: ParsedOrderRow, scope: ShoppingListScope, timezone: string): boolean {
  if (scope.type === "day") {
    return row._dateKey === scope.dateKey;
  }

  if (scope.type === "week") {
    const anchor = dateFromDateKey(scope.anchorDateKey);
    if (!anchor) return false;
    const weekKeys = buildWeekDateKeys(anchor, timezone);
    return row._dateKey != null && weekKeys.has(row._dateKey);
  }

  if (scope.type === "order_ref") {
    const target = normalizeForMatch(scope.reference);
    if (!target) return false;
    return normalizeForMatch(row.folio) === target || normalizeForMatch(row.operation_id ?? "") === target;
  }

  return matchesLookupQuery(row, scope.query);
}

function sortRows(a: ParsedOrderRow, b: ParsedOrderRow): number {
  const keyA = a._dateKey ?? "0000-01-01";
  const keyB = b._dateKey ?? "0000-01-01";
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  const dateCmp = a.fecha_hora_entrega.localeCompare(b.fecha_hora_entrega);
  if (dateCmp !== 0) return dateCmp;
  return a.folio.localeCompare(b.folio);
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

  let best: { profile: RecipeProfile; score: number } | undefined;

  for (const profile of recipeProfiles) {
    const score = profile.aliases.reduce((acc, alias) => {
      const aliasPhrase = normalizePhrase(alias);
      if (!aliasPhrase) return acc;
      if (normalized.includes(aliasPhrase)) return acc + 4;

      const aliasTokens = tokenize(aliasPhrase).filter((token) => token.length >= 3);
      const matched = aliasTokens.filter((token) => normalized.includes(token)).length;
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

function buildAggregation(args: {
  rows: ParsedOrderRow[];
  assumptions: string[];
  recipeProfiles: RecipeProfile[];
  manualIntervention: ShoppingListManualIntervention[];
}): {
  products: ShoppingListProductItem[];
  supplies: ShoppingListSupplyItem[];
} {
  const productsMap = new Map<string, { product: string; quantity: number; orders: number }>();
  const suppliesMap = new Map<string, { item: string; unit: string; amount: number; sourceProducts: Set<string> }>();

  for (const row of args.rows) {
    const productKey = row._productKey || normalizePhrase(row.producto);
    if (!productsMap.has(productKey)) {
      productsMap.set(productKey, {
        product: row.producto,
        quantity: 0,
        orders: 0
      });
    }

    const productAcc = productsMap.get(productKey)!;
    productAcc.quantity += row.cantidad;
    productAcc.orders += 1;
  }

  for (const product of productsMap.values()) {
    const recipe = findRecipeProfile(product.product, args.recipeProfiles);
    if (!recipe) {
      args.assumptions.push(`sin receta mapeada para "${product.product}"; se excluyo del calculo de insumos`);
      args.manualIntervention.push({
        type: "missing_recipe",
        reference: product.product,
        product: product.product,
        detail: `Producto sin receta mapeada (x${product.quantity}).`
      });
      continue;
    }

    for (const item of recipe.items) {
      const mapKey = `${normalizePhrase(item.item)}|${item.unit}`;
      if (!suppliesMap.has(mapKey)) {
        suppliesMap.set(mapKey, {
          item: item.item,
          unit: item.unit,
          amount: 0,
          sourceProducts: new Set<string>()
        });
      }
      const supply = suppliesMap.get(mapKey)!;
      supply.amount += item.perUnit * product.quantity;
      supply.sourceProducts.add(product.product);
    }
  }

  const products = [...productsMap.values()]
    .map((product) => ({
      product: product.product,
      quantity: product.quantity,
      orders: product.orders
    }))
    .sort((a, b) => b.quantity - a.quantity || a.product.localeCompare(b.product));

  const supplies = [...suppliesMap.values()]
    .map((supply) => ({
      item: supply.item,
      unit: supply.unit,
      amount: roundAmount(supply.amount, supply.unit),
      sourceProducts: [...supply.sourceProducts].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => a.item.localeCompare(b.item));

  return { products, supplies };
}

export function createShoppingListGenerateTool(config: ShoppingListToolConfig = {}) {
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

  return async function shoppingListGenerate(args: {
    chat_id: string;
    scope: ShoppingListScope;
    limit?: number;
  }): Promise<ShoppingListResult> {
    if (!gwsSpreadsheetId) {
      throw new Error("shopping_list_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("shopping_list_gws_range_missing");
    }

    if (args.scope.type === "day" && !dateFromDateKey(args.scope.dateKey)) {
      throw new Error("shopping_list_scope_invalid");
    }
    if (args.scope.type === "week" && !dateFromDateKey(args.scope.anchorDateKey)) {
      throw new Error("shopping_list_scope_invalid");
    }
    if (args.scope.type === "order_ref" && args.scope.reference.trim().length < 3) {
      throw new Error("shopping_list_scope_invalid");
    }
    if (args.scope.type === "lookup" && args.scope.query.trim().length < 2) {
      throw new Error("shopping_list_scope_invalid");
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
      errorPrefix: "shopping_list_gws",
      invalidPayloadError: "shopping_list_gws_invalid_payload",
      commandUnavailableError: "shopping_list_gws_command_unavailable",
      failedError: "shopping_list_gws_failed"
    });

    const assumptions: string[] = [];
    const manualIntervention: ShoppingListManualIntervention[] = [];
    let recipeProfiles: RecipeProfile[] = inlineRecipeProfiles;
    let effectiveRecipeSource: ShoppingListRecipeSource | "inline_fallback" = recipeSource;
    if (recipeSource === "gws") {
      if (!recipesGwsSpreadsheetId) {
        throw new Error("shopping_list_recipes_gws_spreadsheet_id_missing");
      }
      if (!recipesNormalizedRange) {
        throw new Error("shopping_list_recipes_gws_range_missing");
      }

      try {
        const recipesReadResult = await readGwsValuesWithRetries({
          command: recipesGwsCommand,
          commandArgs: recipesGwsCommandArgs,
          spreadsheetId: recipesGwsSpreadsheetId,
          range: recipesNormalizedRange,
          timeoutMs: recipesTimeoutMs,
          maxRetries: recipesMaxRetries,
          retryBackoffMs: recipesRetryBackoffMs,
          runner: gwsRunner,
          errorPrefix: "shopping_list_recipes_gws",
          invalidPayloadError: "shopping_list_recipes_gws_invalid_payload",
          commandUnavailableError: "shopping_list_recipes_gws_command_unavailable",
          failedError: "shopping_list_recipes_gws_failed"
        });

        const parsedRecipes = parseRecipeProfiles(recipesReadResult.rows);
        assumptions.push(...parsedRecipes.assumptions);
        if (parsedRecipes.profiles.length === 0) {
          throw new Error("shopping_list_recipes_catalog_empty");
        }
        recipeProfiles = parsedRecipes.profiles;
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        const canFallback =
          safeDetail === "shopping_list_recipes_catalog_empty" ||
          safeDetail.startsWith("shopping_list_recipes_gws_");
        if (!canFallback) {
          throw err;
        }
        effectiveRecipeSource = "inline_fallback";
        assumptions.push("Catalogo de recetas vacio o invalido, use recetas base por defecto. Revisa CatalogoRecetas.");
      }
    }

    const parsedRows = mapRows(readResult.rows, timezone, assumptions);
    manualIntervention.push(...parsedRows.manualIntervention);
    const maxRows = Number.isFinite(args.limit) && (args.limit ?? 0) > 0 ? Math.trunc(args.limit!) : limit;
    const filtered = parsedRows.rows
      .filter((row) => matchesScope(row, args.scope, timezone))
      .sort(sortRows)
      .slice(0, maxRows);

    const { products, supplies } = buildAggregation({
      rows: filtered,
      assumptions,
      recipeProfiles,
      manualIntervention
    });

    const orders = filtered.map(({ _dateKey: _ignoredDateKey, _matchKey: _ignoredMatchKey, _productKey: _ignoredProductKey, ...row }) => row);
    return {
      scope: args.scope,
      timezone,
      totalOrders: orders.length,
      orders,
      products,
      supplies,
      manualIntervention: [...manualIntervention],
      assumptions: [...new Set(assumptions)],
      detail: `shopping-list-generate executed (provider=gws, attempt=${readResult.attempt}, scope=${args.scope.type}, recipe_source=${effectiveRecipeSource})`
    };
  };
}

export const shoppingListGenerateTool = createShoppingListGenerateTool();
