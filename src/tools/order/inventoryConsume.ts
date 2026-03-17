import type { ToolExecutionResult } from "../types";
import { normalizeGwsReadRange, readGwsValuesWithRetries } from "../googleWorkspace/gwsReadValues";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

export type InventoryConsumeReference = {
  folio?: string;
  operation_id_ref?: string;
};

export type InventoryConsumeExecutionLine = {
  insumo: string;
  unidad: string;
  delta_cantidad: number;
  stock_antes: number;
  stock_despues: number;
};

export type InventoryConsumeReconciliation = {
  order_ref: string;
  consumed_applied: Array<Pick<InventoryConsumeExecutionLine, "insumo" | "unidad" | "delta_cantidad">>;
  consumed_pending: Array<Pick<InventoryConsumeExecutionLine, "insumo" | "unidad" | "delta_cantidad">>;
  detected_at: string;
};

export type InventoryConsumeExecutionPayload = {
  reference: InventoryConsumeReference;
  order_row_index?: number;
  consumed: InventoryConsumeExecutionLine[];
  movements_written: number;
  idempotent_replay: boolean;
  detail: string;
  reconciliation?: InventoryConsumeReconciliation;
};

export type InventoryRecipeItem = {
  item: string;
  unit: string;
  perUnit: number;
};

export type InventoryRecipeProfile = {
  id: string;
  aliases: string[];
  items: InventoryRecipeItem[];
};

export type InventoryRecipeSource = "inline" | "gws";

export type InventoryConsumeToolConfig = {
  dryRunDefault?: boolean;
  allowNegativeStock?: boolean;
  recipeSource?: InventoryRecipeSource;
  recipeProfiles?: InventoryRecipeProfile[];
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  ordersGwsRange?: string;
  recipesGwsRange?: string;
  inventoryGwsRange?: string;
  movementsGwsRange?: string;
  gwsValueInputOption?: "RAW" | "USER_ENTERED";
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type OrderRow = {
  sheetRow: number;
  row: Array<string | number>;
  folio: string;
  operation_id?: string;
  producto: string;
  cantidad: number;
  estado_pedido?: string;
};

type RecipeSupply = {
  item: string;
  unit: string;
  amount: number;
};

type InventoryRow = {
  sheetRow: number;
  row: Array<string | number>;
  insumo_id: string;
  insumo: string;
  unidad_base: string;
  stock_actual: number;
  activo: boolean;
};

type MovementRow = {
  operation_id: string;
  order_ref: string;
  evento: string;
  insumo_id: string;
  delta_cantidad: number;
  stock_antes: number;
  stock_despues: number;
  unidad: string;
};

type ConsumePlanLine = {
  line: InventoryConsumeExecutionLine;
  inventoryRow: InventoryRow;
  updatedRow: Array<string | number>;
  movementRow: Array<string | number>;
};

type ParsedRange = {
  sheet: string;
  startCol: string;
  startRow: number;
  width: number;
};

const ORDER_INDEX = {
  folio: 1,
  producto: 5,
  cantidad: 7,
  operation_id: 17,
  estado_pedido: 19
} as const;

const INVENTORY_INDEX = {
  insumo_id: 0,
  insumo: 1,
  unidad_base: 2,
  stock_actual: 3,
  activo: 5,
  actualizado_en: 6
} as const;

const MOVEMENT_INDEX = {
  movimiento_id: 0,
  operation_id: 1,
  order_ref: 2,
  evento: 3,
  insumo_id: 4,
  delta_cantidad: 5,
  stock_antes: 6,
  stock_despues: 7,
  unidad: 8,
  created_at: 9
} as const;

const DEFAULT_INLINE_RECIPES: InventoryRecipeProfile[] = [
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

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizePhrase(value: string): string {
  return normalizeForMatch(value)
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnit(value: string): string {
  return normalizeForMatch(value).replace(/\s+/g, "");
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

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function toNumberMaybe(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toPositiveIntMaybe(value: unknown): number | undefined {
  const n = toNumberMaybe(value);
  if (n == null || !Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

function parseActive(value: unknown): boolean {
  const normalized = normalizeForMatch(String(value ?? ""));
  if (!normalized) return true;
  if (["0", "false", "no", "off", "inactivo"].includes(normalized)) return false;
  return true;
}

function ensureReference(value: InventoryConsumeReference): InventoryConsumeReference {
  const folio = trimOptional(value.folio);
  const operation_id_ref = trimOptional(value.operation_id_ref);
  if (!folio && !operation_id_ref) {
    throw new Error("inventory_consume_reference_missing");
  }
  return { folio, operation_id_ref };
}

function lettersToColumnNumber(value: string): number {
  let out = 0;
  for (const ch of value.toUpperCase()) {
    if (ch < "A" || ch > "Z") return 0;
    out = out * 26 + (ch.charCodeAt(0) - 64);
  }
  return out;
}

function columnNumberToLetters(value: number): string {
  let n = Math.trunc(value);
  if (n <= 0) return "A";
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.trunc((n - 1) / 26);
  }
  return out;
}

function parseRangeMeta(normalizedRange: string): ParsedRange {
  const [sheetRaw, a1Raw = "A:Z"] = normalizedRange.split("!");
  const sheet = sheetRaw.trim() || "Sheet1";
  const a1 = a1Raw.trim() || "A:Z";
  const [startTokenRaw, endTokenRaw] = a1.split(":");
  const startToken = startTokenRaw?.trim() || "A";
  const endToken = endTokenRaw?.trim() || startToken;

  const startMatch = startToken.match(/^([A-Za-z]+)(\d+)?$/);
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);

  const startCol = startMatch?.[1]?.toUpperCase() || "A";
  const endCol = endMatch?.[1]?.toUpperCase() || startCol;
  const startRow = Number(startMatch?.[2] ?? "1");

  const startColNum = lettersToColumnNumber(startCol);
  const endColNum = lettersToColumnNumber(endCol);
  const width = startColNum > 0 && endColNum >= startColNum ? endColNum - startColNum + 1 : 26;

  return {
    sheet,
    startCol,
    startRow: Number.isInteger(startRow) && startRow > 0 ? startRow : 1,
    width
  };
}

function rowRangeFor(args: { meta: ParsedRange; row: number; width: number }): string {
  const startColNum = lettersToColumnNumber(args.meta.startCol) || 1;
  const endColNum = startColNum + Math.max(1, args.width) - 1;
  const endCol = columnNumberToLetters(endColNum);
  return `${args.meta.sheet}!${args.meta.startCol}${args.row}:${endCol}${args.row}`;
}

function isOrderHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("folio") && normalized.includes("producto");
}

function isInventoryHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("insumo_id") && normalized.includes("stock_actual");
}

function isMovementHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("operation_id") && normalized.includes("order_ref") && normalized.includes("evento");
}

function isRecipeHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => normalizeForMatch(cell));
  return normalized.includes("recipe_id") && normalized.includes("insumo");
}

function toRowsWithIndex(rows: string[][], args: { hasHeader: (row: string[]) => boolean; startRow: number }): Array<{
  sheetRow: number;
  row: string[];
}> {
  const hasHeader = rows.length > 0 && args.hasHeader(rows[0]);
  const skip = hasHeader ? 1 : 0;
  const out: Array<{ sheetRow: number; row: string[] }> = [];

  for (let idx = 0; idx < rows.length - skip; idx += 1) {
    const row = rows[idx + skip] ?? [];
    out.push({
      sheetRow: args.startRow + skip + idx,
      row
    });
  }

  return out;
}

function parseOrders(rows: string[][], startRow: number): OrderRow[] {
  return toRowsWithIndex(rows, { hasHeader: isOrderHeaderRow, startRow })
    .map(({ sheetRow, row }) => {
      const cantidad = toPositiveIntMaybe(row[ORDER_INDEX.cantidad]);
      if (cantidad == null) {
        throw new Error("inventory_consume_order_quantity_invalid");
      }
      return {
        sheetRow,
        row: [...row],
        folio: row[ORDER_INDEX.folio] ?? "",
        operation_id: trimOptional(row[ORDER_INDEX.operation_id]),
        producto: row[ORDER_INDEX.producto] ?? "",
        cantidad,
        estado_pedido: trimOptional(row[ORDER_INDEX.estado_pedido])
      };
    })
    .filter((row) => trimOptional(row.producto) != null && (trimOptional(row.folio) != null || trimOptional(row.operation_id) != null));
}

function parseInventory(rows: string[][], startRow: number): InventoryRow[] {
  return toRowsWithIndex(rows, { hasHeader: isInventoryHeaderRow, startRow })
    .map(({ sheetRow, row }) => {
      const stockActual = toNumberMaybe(row[INVENTORY_INDEX.stock_actual]);
      if (stockActual == null) {
        throw new Error("inventory_consume_supply_stock_invalid");
      }
      const unidad = trimOptional(row[INVENTORY_INDEX.unidad_base]);
      const insumoId = trimOptional(row[INVENTORY_INDEX.insumo_id]);
      const insumo = trimOptional(row[INVENTORY_INDEX.insumo]);
      if (!unidad || !insumoId || !insumo) {
        throw new Error("inventory_consume_supply_row_invalid");
      }
      return {
        sheetRow,
        row: [...row],
        insumo_id: insumoId,
        insumo,
        unidad_base: unidad,
        stock_actual: stockActual,
        activo: parseActive(row[INVENTORY_INDEX.activo])
      };
    })
    .filter((row) => trimOptional(row.insumo_id) != null);
}

function parseMovements(rows: string[][]): MovementRow[] {
  return toRowsWithIndex(rows, { hasHeader: isMovementHeaderRow, startRow: 1 })
    .map(({ row }) => ({
      operation_id: trimOptional(row[MOVEMENT_INDEX.operation_id]) ?? "",
      order_ref: trimOptional(row[MOVEMENT_INDEX.order_ref]) ?? "",
      evento: trimOptional(row[MOVEMENT_INDEX.evento]) ?? "",
      insumo_id: trimOptional(row[MOVEMENT_INDEX.insumo_id]) ?? "",
      delta_cantidad: toNumberMaybe(row[MOVEMENT_INDEX.delta_cantidad]) ?? 0,
      stock_antes: toNumberMaybe(row[MOVEMENT_INDEX.stock_antes]) ?? 0,
      stock_despues: toNumberMaybe(row[MOVEMENT_INDEX.stock_despues]) ?? 0,
      unidad: trimOptional(row[MOVEMENT_INDEX.unidad]) ?? ""
    }))
    .filter((row) => row.operation_id.length > 0 && row.order_ref.length > 0);
}

function parseRecipeActive(value: unknown): boolean {
  return parseActive(value);
}

function parseRecipeAliases(recipeId: string, aliasesCsv: string): string[] {
  const items = [recipeId, ...aliasesCsv.split(/[;,]/g)]
    .map((value) => normalizePhrase(value))
    .filter((value) => value.length > 0);
  return [...new Set(items)];
}

function parseRecipeProfiles(rows: string[][]): InventoryRecipeProfile[] {
  const dataRows = rows.length > 0 && isRecipeHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const byRecipe = new Map<string, { id: string; aliases: Set<string>; items: Map<string, InventoryRecipeItem> }>();

  for (const row of dataRows) {
    const rawRecipeId = trimOptional(row[0]) ?? "";
    const rawAliases = trimOptional(row[1]) ?? "";
    const rawItem = trimOptional(row[2]);
    const rawUnit = normalizeUnit(trimOptional(row[3]) ?? "");
    const rawPerUnit = toNumberMaybe(row[4]);
    const active = parseRecipeActive(row[5]);

    if (!active) continue;
    if (!rawItem || !rawUnit || rawPerUnit == null || rawPerUnit <= 0) continue;

    const aliases = parseRecipeAliases(rawRecipeId, rawAliases);
    if (aliases.length === 0) continue;

    const recipeId = normalizePhrase(rawRecipeId || aliases[0]).replace(/\s+/g, "_");
    if (!recipeId) continue;

    if (!byRecipe.has(recipeId)) {
      byRecipe.set(recipeId, {
        id: recipeId,
        aliases: new Set<string>(),
        items: new Map<string, InventoryRecipeItem>()
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

  return [...byRecipe.values()]
    .map((recipe) => ({
      id: recipe.id,
      aliases: [...recipe.aliases],
      items: [...recipe.items.values()]
    }))
    .filter((recipe) => recipe.aliases.length > 0 && recipe.items.length > 0);
}

function tokenize(value: string): string[] {
  return normalizePhrase(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function findRecipeProfile(productName: string, recipeProfiles: InventoryRecipeProfile[]): InventoryRecipeProfile | undefined {
  const normalized = normalizePhrase(productName);
  if (!normalized) return undefined;

  let best: { profile: InventoryRecipeProfile; score: number } | undefined;

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

function buildRequiredSupplies(args: { order: OrderRow; recipe: InventoryRecipeProfile }): RecipeSupply[] {
  const byKey = new Map<string, RecipeSupply>();

  for (const item of args.recipe.items) {
    const key = `${normalizePhrase(item.item)}|${normalizeUnit(item.unit)}`;
    const amount = item.perUnit * args.order.cantidad;
    if (amount <= 0 || !Number.isFinite(amount)) continue;

    if (!byKey.has(key)) {
      byKey.set(key, {
        item: item.item,
        unit: normalizeUnit(item.unit),
        amount: 0
      });
    }

    const current = byKey.get(key)!;
    current.amount += amount;
  }

  return [...byKey.values()];
}

function resolveOrderByReference(orders: OrderRow[], reference: InventoryConsumeReference): OrderRow {
  const folio = trimOptional(reference.folio);
  const operationId = trimOptional(reference.operation_id_ref);

  const byFolio = folio
    ? orders.filter((row) => normalizeForMatch(row.folio) === normalizeForMatch(folio))
    : [];
  const byOperation = operationId
    ? orders.filter((row) => normalizeForMatch(row.operation_id ?? "") === normalizeForMatch(operationId))
    : [];

  if (folio && operationId) {
    const exact = orders.filter(
      (row) =>
        normalizeForMatch(row.folio) === normalizeForMatch(folio) &&
        normalizeForMatch(row.operation_id ?? "") === normalizeForMatch(operationId)
    );

    if (exact.length === 1) return exact[0];
    if (exact.length > 1) throw new Error("inventory_consume_reference_ambiguous");

    if (byFolio.length > 0 || byOperation.length > 0) {
      throw new Error("inventory_consume_reference_ambiguous");
    }

    throw new Error("inventory_consume_not_found");
  }

  const matches = folio ? byFolio : byOperation;
  if (matches.length === 0) throw new Error("inventory_consume_not_found");
  if (matches.length > 1) throw new Error("inventory_consume_reference_ambiguous");
  return matches[0];
}

function isCanceledOrder(order: OrderRow): boolean {
  return normalizeForMatch(order.estado_pedido ?? "") === "cancelado";
}

function isWeightUnit(unit: string): boolean {
  const normalized = normalizeUnit(unit);
  return normalized === "g" || normalized === "kg";
}

function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) return value;
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toCanonicalGrams(amount: number, unit: string): number {
  const normalized = normalizeUnit(unit);
  if (normalized === "g") return roundHalfUp(amount);
  if (normalized === "kg") return roundHalfUp(amount * 1000);
  throw new Error("inventory_consume_unit_not_supported");
}

function fromCanonicalGrams(grams: number, unit: string): number {
  const normalized = normalizeUnit(unit);
  if (normalized === "g") return roundHalfUp(grams);
  if (normalized === "kg") return roundTo(grams / 1000, 3);
  throw new Error("inventory_consume_unit_not_supported");
}

function roundByUnit(value: number, unit: string): number {
  const normalized = normalizeUnit(unit);
  if (normalized === "g") return roundHalfUp(value);
  if (normalized === "kg") return roundTo(value, 3);
  return roundTo(value, 3);
}

function buildSupplyScore(args: { recipeItem: string; inventory: InventoryRow }): number {
  const recipeNorm = normalizePhrase(args.recipeItem);
  const invId = normalizePhrase(args.inventory.insumo_id);
  const invName = normalizePhrase(args.inventory.insumo);
  if (!recipeNorm || (!invId && !invName)) return 0;

  let score = 0;
  if (recipeNorm === invId || recipeNorm === invName) score += 100;
  if (invId.includes(recipeNorm) || invName.includes(recipeNorm)) score += 20;

  const recipeTokens = tokenize(recipeNorm).filter((token) => token.length >= 2);
  for (const token of recipeTokens) {
    if (invId.includes(token) || invName.includes(token)) {
      score += 3;
    }
  }

  return score;
}

function resolveInventoryRowForSupply(args: { supply: RecipeSupply; inventoryRows: InventoryRow[] }): InventoryRow {
  const activeRows = args.inventoryRows.filter((row) => row.activo);
  const scored = activeRows
    .map((row) => ({ row, score: buildSupplyScore({ recipeItem: args.supply.item, inventory: row }) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    throw new Error("inventory_consume_supply_not_found");
  }

  const bestScore = scored[0].score;
  const best = scored.filter((entry) => entry.score === bestScore);
  if (best.length > 1) {
    throw new Error("inventory_consume_supply_not_found");
  }

  return best[0].row;
}

function buildConsumePlan(args: {
  operationId: string;
  orderRef: string;
  requiredSupplies: RecipeSupply[];
  inventoryRows: InventoryRow[];
  inventoryWidth: number;
  movementWidth: number;
  allowNegativeStock: boolean;
  nowIso: string;
}): ConsumePlanLine[] {
  const out: ConsumePlanLine[] = [];
  const inventoryByRow = new Map<number, { row: InventoryRow; stock: number }>();

  for (const inventoryRow of args.inventoryRows) {
    inventoryByRow.set(inventoryRow.sheetRow, {
      row: inventoryRow,
      stock: inventoryRow.stock_actual
    });
  }

  for (const supply of args.requiredSupplies) {
    const target = resolveInventoryRowForSupply({
      supply,
      inventoryRows: args.inventoryRows
    });

    const stockState = inventoryByRow.get(target.sheetRow);
    if (!stockState) {
      throw new Error("inventory_consume_supply_not_found");
    }

    const inventoryUnit = normalizeUnit(stockState.row.unidad_base);
    const recipeUnit = normalizeUnit(supply.unit);

    let deltaInventoryUnit: number;
    let beforeStock: number;
    let afterStock: number;

    if (isWeightUnit(inventoryUnit) && isWeightUnit(recipeUnit)) {
      const requiredGrams = toCanonicalGrams(supply.amount, recipeUnit);
      const beforeGrams = toCanonicalGrams(stockState.stock, inventoryUnit);
      const afterGrams = beforeGrams - requiredGrams;

      if (!args.allowNegativeStock && afterGrams < 0) {
        throw new Error("inventory_consume_insufficient_stock");
      }

      beforeStock = fromCanonicalGrams(beforeGrams, inventoryUnit);
      afterStock = fromCanonicalGrams(afterGrams, inventoryUnit);
      deltaInventoryUnit = fromCanonicalGrams(-requiredGrams, inventoryUnit);
    } else if (inventoryUnit === recipeUnit) {
      const required = roundByUnit(supply.amount, inventoryUnit);
      beforeStock = roundByUnit(stockState.stock, inventoryUnit);
      afterStock = roundByUnit(beforeStock - required, inventoryUnit);

      if (!args.allowNegativeStock && afterStock < 0) {
        throw new Error("inventory_consume_insufficient_stock");
      }

      deltaInventoryUnit = roundByUnit(-required, inventoryUnit);
    } else {
      throw new Error("inventory_consume_unit_not_supported");
    }

    const updatedRow = Array.from({ length: args.inventoryWidth }, (_, idx) => {
      const existing = stockState.row.row[idx];
      return existing == null ? "" : existing;
    });
    updatedRow[INVENTORY_INDEX.stock_actual] = afterStock;
    updatedRow[INVENTORY_INDEX.actualizado_en] = args.nowIso;

    const movementRow: Array<string | number> = Array.from({ length: args.movementWidth }, () => "");
    movementRow[MOVEMENT_INDEX.movimiento_id] = `${args.operationId}-${String(out.length + 1).padStart(2, "0")}`;
    movementRow[MOVEMENT_INDEX.operation_id] = args.operationId;
    movementRow[MOVEMENT_INDEX.order_ref] = args.orderRef;
    movementRow[MOVEMENT_INDEX.evento] = "consume";
    movementRow[MOVEMENT_INDEX.insumo_id] = stockState.row.insumo_id;
    movementRow[MOVEMENT_INDEX.delta_cantidad] = deltaInventoryUnit;
    movementRow[MOVEMENT_INDEX.stock_antes] = beforeStock;
    movementRow[MOVEMENT_INDEX.stock_despues] = afterStock;
    movementRow[MOVEMENT_INDEX.unidad] = inventoryUnit;
    movementRow[MOVEMENT_INDEX.created_at] = args.nowIso;

    out.push({
      line: {
        insumo: stockState.row.insumo,
        unidad: inventoryUnit,
        delta_cantidad: deltaInventoryUnit,
        stock_antes: beforeStock,
        stock_despues: afterStock
      },
      inventoryRow: stockState.row,
      updatedRow,
      movementRow
    });

    stockState.stock = afterStock;
  }

  return out;
}

function normalizeReplayRows(args: {
  movementRows: MovementRow[];
  operationId: string;
  orderRef: string;
}): InventoryConsumeExecutionLine[] {
  return args.movementRows
    .filter(
      (row) =>
        normalizeForMatch(row.operation_id) === normalizeForMatch(args.operationId) &&
        normalizeForMatch(row.order_ref) === normalizeForMatch(args.orderRef) &&
        normalizeForMatch(row.evento) === "consume"
    )
    .map((row) => ({
      insumo: row.insumo_id,
      unidad: row.unidad,
      delta_cantidad: row.delta_cantidad,
      stock_antes: row.stock_antes,
      stock_despues: row.stock_despues
    }));
}

async function writeValuesUpdateWithRetries(args: {
  gwsRunner: GwsCommandRunner;
  gwsCommand: string;
  gwsCommandArgs: string[];
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  writeParams: Record<string, unknown>;
  writeBody: Record<string, unknown>;
  errorPrefix: string;
}): Promise<void> {
  const attempts = args.maxRetries + 1;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const writeResult = await args.gwsRunner({
        command: args.gwsCommand,
        commandArgs: [
          ...args.gwsCommandArgs,
          "sheets",
          "spreadsheets",
          "values",
          "update",
          "--params",
          JSON.stringify(args.writeParams),
          "--json",
          JSON.stringify(args.writeBody)
        ],
        timeoutMs: args.timeoutMs
      });

      const parsedWriteStdout = parseJsonText(writeResult.stdout);
      const parsedWriteStderr = parseJsonText(writeResult.stderr);
      const writeErrInfo = extractGwsError(parsedWriteStdout) ?? extractGwsError(parsedWriteStderr);
      const writeRetriable = isRetriableGwsFailure({
        timedOut: writeResult.timedOut,
        code: writeErrInfo?.code,
        stdout: writeResult.stdout,
        stderr: writeResult.stderr
      });

      if (writeResult.timedOut || writeResult.exitCode !== 0 || writeErrInfo) {
        if (writeRetriable && attempt < attempts) {
          await sleep(args.retryBackoffMs * attempt);
          continue;
        }
        const token = sanitizeErrorToken((writeErrInfo?.message ?? writeResult.stderr) || `exit_${writeResult.exitCode ?? "unknown"}`);
        throw new Error(`${args.errorPrefix}_${token}`);
      }

      return;
    } catch (err) {
      const cls = classifyGwsSpawnError(err);
      if (cls === "network" && attempt < attempts) {
        await sleep(args.retryBackoffMs * attempt);
        continue;
      }

      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      if (code === "ENOENT") {
        throw new Error("inventory_consume_gws_command_unavailable");
      }

      lastError = err instanceof Error ? err : new Error(String(err));
      break;
    }
  }

  throw lastError ?? new Error("inventory_consume_failed");
}

function extractOrderReference(order: OrderRow, reference: InventoryConsumeReference): InventoryConsumeReference {
  return {
    folio: trimOptional(order.folio) ?? trimOptional(reference.folio),
    operation_id_ref: trimOptional(order.operation_id) ?? trimOptional(reference.operation_id_ref)
  };
}

function selectedOrderRef(order: OrderRow, reference: InventoryConsumeReference): string {
  return trimOptional(order.folio) ?? trimOptional(order.operation_id) ?? trimOptional(reference.folio) ?? trimOptional(reference.operation_id_ref) ?? "unknown";
}

function toMovementStartRow(args: { rows: string[][]; startRow: number }): number {
  const hasHeader = args.rows.length > 0 && isMovementHeaderRow(args.rows[0]);
  const dataRows = hasHeader ? args.rows.length - 1 : args.rows.length;
  return args.startRow + (hasHeader ? 1 : 0) + dataRows;
}

export function createInventoryConsumeTool(config: InventoryConsumeToolConfig = {}) {
  const dryRunDefault = config.dryRunDefault ?? true;
  const allowNegativeStock = config.allowNegativeStock ?? false;
  const recipeSource: InventoryRecipeSource = config.recipeSource ?? "inline";
  const recipeProfiles = config.recipeProfiles ?? DEFAULT_INLINE_RECIPES;

  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;

  const ordersRange = normalizeGwsReadRange(config.ordersGwsRange, "A:U") ?? "Pedidos!A:U";
  const recipesRange = normalizeGwsReadRange(config.recipesGwsRange, "A:F") ?? "CatalogoRecetas!A:F";
  const inventoryRange = normalizeGwsReadRange(config.inventoryGwsRange, "A:G") ?? "Inventario!A:G";
  const movementsRange = normalizeGwsReadRange(config.movementsGwsRange, "A:J") ?? "MovimientosInventario!A:J";

  const gwsValueInputOption = config.gwsValueInputOption ?? "USER_ENTERED";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function inventoryConsume(args: {
    operation_id: string;
    chat_id: string;
    reference: InventoryConsumeReference;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<InventoryConsumeExecutionPayload>> {
    const reference = ensureReference(args.reference);
    const dry_run = args.dryRun ?? dryRunDefault;

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: {
          reference,
          consumed: [],
          movements_written: 0,
          idempotent_replay: false,
          detail: "inventory-consume dry-run"
        },
        detail: "inventory-consume dry-run"
      };
    }

    if (!gwsSpreadsheetId) throw new Error("inventory_consume_gws_spreadsheet_id_missing");
    if (!ordersRange) throw new Error("inventory_consume_orders_gws_range_missing");
    if (!inventoryRange) throw new Error("inventory_consume_inventory_gws_range_missing");
    if (!movementsRange) throw new Error("inventory_consume_movements_gws_range_missing");
    if (recipeSource === "gws" && !recipesRange) throw new Error("inventory_consume_recipes_gws_range_missing");

    const ordersRead = await readGwsValuesWithRetries({
      command: gwsCommand,
      commandArgs: gwsCommandArgs,
      spreadsheetId: gwsSpreadsheetId,
      range: ordersRange,
      timeoutMs,
      maxRetries,
      retryBackoffMs,
      runner: gwsRunner,
      errorPrefix: "inventory_consume_orders_gws",
      invalidPayloadError: "inventory_consume_orders_gws_invalid_payload",
      commandUnavailableError: "inventory_consume_gws_command_unavailable",
      failedError: "inventory_consume_orders_gws_failed"
    });

    const inventoryRead = await readGwsValuesWithRetries({
      command: gwsCommand,
      commandArgs: gwsCommandArgs,
      spreadsheetId: gwsSpreadsheetId,
      range: inventoryRange,
      timeoutMs,
      maxRetries,
      retryBackoffMs,
      runner: gwsRunner,
      errorPrefix: "inventory_consume_inventory_gws",
      invalidPayloadError: "inventory_consume_inventory_gws_invalid_payload",
      commandUnavailableError: "inventory_consume_gws_command_unavailable",
      failedError: "inventory_consume_inventory_gws_failed"
    });

    const movementsRead = await readGwsValuesWithRetries({
      command: gwsCommand,
      commandArgs: gwsCommandArgs,
      spreadsheetId: gwsSpreadsheetId,
      range: movementsRange,
      timeoutMs,
      maxRetries,
      retryBackoffMs,
      runner: gwsRunner,
      errorPrefix: "inventory_consume_movements_gws",
      invalidPayloadError: "inventory_consume_movements_gws_invalid_payload",
      commandUnavailableError: "inventory_consume_gws_command_unavailable",
      failedError: "inventory_consume_movements_gws_failed"
    });

    let activeRecipeProfiles = recipeProfiles;
    if (recipeSource === "gws") {
      const recipesRead = await readGwsValuesWithRetries({
        command: gwsCommand,
        commandArgs: gwsCommandArgs,
        spreadsheetId: gwsSpreadsheetId,
        range: recipesRange,
        timeoutMs,
        maxRetries,
        retryBackoffMs,
        runner: gwsRunner,
        errorPrefix: "inventory_consume_recipes_gws",
        invalidPayloadError: "inventory_consume_recipes_gws_invalid_payload",
        commandUnavailableError: "inventory_consume_gws_command_unavailable",
        failedError: "inventory_consume_recipes_gws_failed"
      });
      activeRecipeProfiles = parseRecipeProfiles(recipesRead.rows);
    }

    if (!activeRecipeProfiles || activeRecipeProfiles.length === 0) {
      throw new Error("inventory_consume_recipe_not_found");
    }

    const orderMeta = parseRangeMeta(ordersRange);
    const inventoryMeta = parseRangeMeta(inventoryRange);
    const movementMeta = parseRangeMeta(movementsRange);

    const orders = parseOrders(ordersRead.rows, orderMeta.startRow);
    const order = resolveOrderByReference(orders, reference);

    if (isCanceledOrder(order)) {
      throw new Error("inventory_consume_order_canceled");
    }

    const orderRef = selectedOrderRef(order, reference);
    const movementRows = parseMovements(movementsRead.rows);
    const replayRows = normalizeReplayRows({
      movementRows,
      operationId: args.operation_id,
      orderRef
    });

    if (replayRows.length > 0) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: {
          reference: extractOrderReference(order, reference),
          order_row_index: order.sheetRow,
          consumed: replayRows,
          movements_written: 0,
          idempotent_replay: true,
          detail: `Consumo ya aplicado para ${orderRef}. operation_id: ${args.operation_id}`
        },
        detail: `Consumo ya aplicado para ${orderRef}. operation_id: ${args.operation_id}`
      };
    }

    const recipe = findRecipeProfile(order.producto, activeRecipeProfiles);
    if (!recipe) {
      throw new Error("inventory_consume_recipe_not_found");
    }

    const requiredSupplies = buildRequiredSupplies({
      order,
      recipe
    });
    if (requiredSupplies.length === 0) {
      throw new Error("inventory_consume_recipe_not_found");
    }

    const inventoryRows = parseInventory(inventoryRead.rows, inventoryMeta.startRow);
    if (inventoryRows.length === 0) {
      throw new Error("inventory_consume_supply_not_found");
    }

    const nowIso = now().toISOString();
    const plan = buildConsumePlan({
      operationId: args.operation_id,
      orderRef,
      requiredSupplies,
      inventoryRows,
      inventoryWidth: inventoryMeta.width,
      movementWidth: movementMeta.width,
      allowNegativeStock,
      nowIso
    });

    let movementsWritten = 0;
    const applied: Array<Pick<InventoryConsumeExecutionLine, "insumo" | "unidad" | "delta_cantidad">> = [];
    let pending: Array<Pick<InventoryConsumeExecutionLine, "insumo" | "unidad" | "delta_cantidad">> = plan.map(({ line }) => ({
      insumo: line.insumo,
      unidad: line.unidad,
      delta_cantidad: line.delta_cantidad
    }));

    try {
      for (const planned of plan) {
        await writeValuesUpdateWithRetries({
          gwsRunner,
          gwsCommand,
          gwsCommandArgs,
          timeoutMs,
          maxRetries,
          retryBackoffMs,
          writeParams: {
            spreadsheetId: gwsSpreadsheetId,
            range: rowRangeFor({
              meta: inventoryMeta,
              row: planned.inventoryRow.sheetRow,
              width: inventoryMeta.width
            }),
            valueInputOption: gwsValueInputOption
          },
          writeBody: {
            values: [planned.updatedRow]
          },
          errorPrefix: "inventory_consume_inventory_gws_write"
        });

        applied.push({
          insumo: planned.line.insumo,
          unidad: planned.line.unidad,
          delta_cantidad: planned.line.delta_cantidad
        });
        pending = pending.slice(1);
      }

      let movementRowNo = toMovementStartRow({
        rows: movementsRead.rows,
        startRow: movementMeta.startRow
      });

      for (const planned of plan) {
        await writeValuesUpdateWithRetries({
          gwsRunner,
          gwsCommand,
          gwsCommandArgs,
          timeoutMs,
          maxRetries,
          retryBackoffMs,
          writeParams: {
            spreadsheetId: gwsSpreadsheetId,
            range: rowRangeFor({
              meta: movementMeta,
              row: movementRowNo,
              width: movementMeta.width
            }),
            valueInputOption: gwsValueInputOption
          },
          writeBody: {
            values: [planned.movementRow]
          },
          errorPrefix: "inventory_consume_movements_gws_write"
        });

        movementRowNo += 1;
        movementsWritten += 1;
      }
    } catch (err) {
      if (applied.length > 0) {
        const reconciliation: InventoryConsumeReconciliation = {
          order_ref: orderRef,
          consumed_applied: applied,
          consumed_pending: pending,
          detected_at: nowIso
        };
        throw new Error(`inventory_consume_partial_failure:${JSON.stringify(reconciliation)}`);
      }

      throw err;
    }

    return {
      ok: true,
      dry_run,
      operation_id: args.operation_id,
      payload: {
        reference: extractOrderReference(order, reference),
        order_row_index: order.sheetRow,
        consumed: plan.map((entry) => entry.line),
        movements_written: movementsWritten,
        idempotent_replay: false,
        detail: "inventory-consume executed"
      },
      detail: "inventory-consume executed"
    };
  };
}

export const inventoryConsumeTool = createInventoryConsumeTool();
