import { v4 as uuidv4 } from "uuid";

import { isCancel, isConfirm } from "../guards/confirmationGuard";
import { registerPendingWithDedupe } from "../guards/dedupeGuard";
import { pickOneMissing } from "../guards/missingFieldPicker";
import type { RateLimitGuard } from "../guards/rateLimitGuard";
import { validateWith } from "../guards/validationGuard";
import { type Expense, ExpenseSchema } from "../schemas/expense";
import { type Order, OrderSchema } from "../schemas/order";
import { type Intent, routeIntentDetailed, type RoutedIntent } from "../skills/intentRouter";
import {
  routeReadOnlyIntentDetailed,
  type ReadOnlyRoutedIntent
} from "../skills/readOnlyIntentRouter";
import {
  extractOrderUpdatePatch as extractOrderUpdatePatchSkill,
  extractOrderReferenceFromText as extractOrderReferenceFromTextSkill,
  hasOrderReference as hasOrderReferenceSkill,
  inventoryOrderRefLabel as inventoryOrderRefLabelSkill,
  parseInventoryConsumeRequest as parseInventoryConsumeRequestSkill,
  parseOrderCancelRequest as parseOrderCancelRequestSkill,
  parseOrderUpdateRequest as parseOrderUpdateRequestSkill,
  parsePaymentRecordRequest as parsePaymentRecordRequestSkill,
  referenceFromFreeText as referenceFromFreeTextSkill
} from "../skills/mutationIntentDrafts";
import { parseExpense, parseOrder, type ParseSource } from "../skills/parser";
import { registerPendingOperation, upsertOperation } from "../state/operations";
import { clearPending, getState, setState } from "../state/stateStore";
import { appendExpenseTool } from "../tools/expense/appendExpense";
import { createAdminHealthTool, type AdminHealthResult } from "../tools/admin/adminHealth";
import { createAdminConfigViewTool, type AdminConfigViewResult } from "../tools/admin/adminConfigView";
import {
  createCodeReviewGraphTool,
  type CodeReviewGraphOperation,
  type CodeReviewGraphResult
} from "../tools/admin/codeReviewGraph";
import { appendOrderTool } from "../tools/order/appendOrder";
import {
  createCancelOrderTool,
  type OrderCancelExecutionPayload,
  type OrderCancelReference
} from "../tools/order/cancelOrder";
import { createCardTool } from "../tools/order/createCard";
import { createLookupOrderTool, type OrderLookupResult } from "../tools/order/lookupOrder";
import {
  createInventoryConsumeTool,
  type InventoryConsumeExecutionPayload,
  type InventoryConsumeReference
} from "../tools/order/inventoryConsume";
import { createOrderCardSyncTool, type TrelloCardSnapshot } from "../tools/order/orderCardSync";
import {
  createQuoteOrderTool,
  type QuoteCustomizationField,
  type QuoteOptionSuggestions,
  type QuoteOrderResult
} from "../tools/order/quoteOrder";
import {
  createRecordPaymentTool,
  type PaymentRecordExecutionPayload,
  type PaymentRecordInput,
  type PaymentRecordReference
} from "../tools/order/recordPayment";
import { createOrderStatusTool, type OrderStatusResult } from "../tools/order/orderStatus";
import { createReportOrdersTool, type OrderReportPeriod, type OrderReportResult } from "../tools/order/reportOrders";
import {
  createShoppingListGenerateTool,
  type ShoppingListResult,
  type ShoppingListScope
} from "../tools/order/shoppingListGenerate";
import {
  createScheduleDayViewTool,
  type ScheduleDayFilter,
  type ScheduleDayViewResult
} from "../tools/order/scheduleDayView";
import {
  createUpdateOrderTool,
  type OrderUpdateExecutionPayload,
  type OrderUpdateReference
} from "../tools/order/updateOrder";
import { normalizeDeliveryDateTime } from "../tools/order/deliveryDateTime";
import { type WebPublishPayload, createPublishSiteTool } from "../tools/web/publishSite";
import { createBotCopy, type BotPersona } from "./persona";

type ParseResult =
  | { ok: true; payload: Record<string, unknown>; source?: ParseSource }
  | { ok: false; error: string; source?: ParseSource };

type ProcessorDeps = {
  allowedChatIds: Set<string>;
  rateLimiter?: RateLimitGuard;
  nowMs?: () => number;
  newOperationId?: () => string;
  routeIntentDetailedFn?: (text: string) => Promise<RoutedIntent>;
  routeReadOnlyIntentFn?: (args: { text: string; enableQuote: boolean }) => Promise<ReadOnlyRoutedIntent>;
  routeIntentFn?: (text: string) => Promise<Intent>;
  parseExpenseFn?: (text: string) => Promise<ParseResult>;
  parseOrderFn?: (text: string) => Promise<ParseResult>;
  parseWebFn?: (text: string) => Promise<ParseResult>;
  executeExpenseFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: Expense;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeCreateCardFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    detail: string;
    payload?: {
      trello_card_id?: string;
      trello_card_created?: boolean;
    };
  }>;
  executeAppendOrderFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    trello_card_id?: string;
    estado_pedido?: string;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeWebPublishFn?: (args: {
    operation_id: string;
    payload: WebPublishPayload;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeOrderReportFn?: (args: {
    chat_id: string;
    period: OrderReportPeriod;
  }) => Promise<OrderReportResult>;
  executeOrderLookupFn?: (args: {
    chat_id: string;
    query: string;
  }) => Promise<OrderLookupResult>;
  executeOrderStatusFn?: (args: {
    chat_id: string;
    query: string;
  }) => Promise<OrderStatusResult>;
  executeAdminHealthFn?: (args: {
    chat_id: string;
  }) => Promise<AdminHealthResult>;
  executeAdminConfigViewFn?: (args: {
    chat_id: string;
  }) => Promise<AdminConfigViewResult>;
  executeCodeReviewGraphFn?: (args: {
    chat_id: string;
    operation: CodeReviewGraphOperation;
    repo_root?: string;
    target_file?: string;
    line_number?: number;
    max_depth?: number;
    include_source?: boolean;
    full_rebuild?: boolean;
  }) => Promise<CodeReviewGraphResult>;
  executeShoppingListFn?: (args: {
    chat_id: string;
    scope: ShoppingListScope;
  }) => Promise<ShoppingListResult>;
  executeScheduleDayViewFn?: (args: {
    chat_id: string;
    day: ScheduleDayFilter;
  }) => Promise<ScheduleDayViewResult>;
  executeQuoteOrderFn?: (args: {
    chat_id: string;
    query: string;
  }) => Promise<QuoteOrderResult>;
  executeOrderUpdateFn?: (args: {
    operation_id: string;
    chat_id: string;
    reference: OrderUpdateReference;
    patch: unknown;
    trello_card_id?: string;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    payload: OrderUpdateExecutionPayload;
    detail: string;
  }>;
  executeOrderCancelFn?: (args: {
    operation_id: string;
    chat_id: string;
    reference: OrderCancelReference;
    motivo?: string;
    trello_card_id?: string;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    payload: OrderCancelExecutionPayload;
    detail: string;
  }>;
  executePaymentRecordFn?: (args: {
    operation_id: string;
    chat_id: string;
    reference: PaymentRecordReference;
    payment: PaymentRecordInput;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    payload: PaymentRecordExecutionPayload;
    detail: string;
  }>;
  executeInventoryConsumeFn?: (args: {
    operation_id: string;
    chat_id: string;
    reference: InventoryConsumeReference;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    payload: InventoryConsumeExecutionPayload;
    detail: string;
  }>;
  orderCardSync?: {
    updateCardForOrder: (args: {
      operation_id: string;
      chat_id: string;
      trello_card_id?: string;
      reference: { operation_id_ref?: string; folio?: string };
      patch: Record<string, unknown>;
      dryRun?: boolean;
    }) => Promise<{ card_id: string; snapshot: TrelloCardSnapshot; dry_run: boolean }>;
    cancelCardForOrder: (args: {
      operation_id: string;
      chat_id: string;
      trello_card_id?: string;
      reference: { operation_id_ref?: string; folio?: string };
      motivo?: string;
      dryRun?: boolean;
    }) => Promise<{ card_id: string; snapshot: TrelloCardSnapshot; dry_run: boolean }>;
    rollbackCard: (args: {
      operation_id: string;
      snapshot: TrelloCardSnapshot;
      dryRun?: boolean;
    }) => Promise<void>;
    deleteCard: (args: {
      operation_id: string;
      card_id: string;
      dryRun?: boolean;
    }) => Promise<void>;
  };
  orderReportTimezone?: string;
  botPersona?: BotPersona;
  webChatEnabled?: boolean;
  inventoryConsumeEnabled?: boolean;
  onTrace?: (event: {
    event: string;
    chat_id: string;
    strict_mode: boolean;
    intent?: string;
    intent_source?: string;
    parse_source?: string;
    detail?: string;
  }) => void;
};

function normalizeForMatch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const DAY_MS = 86_400_000;
const REPORT_DEFAULT_TIMEZONE = "America/Mexico_City";
const MONTH_INDEX: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  sept: 9,
  sep: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12
};

const MONTH_LABELS = [
  "",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];

function toDateKeyFromDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function currentDatePartsInTimezone(date: Date, timezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1")
  };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function monthNameToNumber(value: string): number | undefined {
  return MONTH_INDEX[value.trim().toLowerCase()];
}

function monthNumberToLabel(month: number): string {
  return MONTH_LABELS[month] ?? "";
}

function parseOrderReportDayPeriod(args: {
  normalized: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  if (/\bhoy\b/.test(args.normalized)) {
    return {
      type: "day",
      dateKey: toDateKeyFromDate(args.now, args.timezone),
      label: "hoy"
    };
  }

  if (/\bmanana\b/.test(args.normalized)) {
    return {
      type: "day",
      dateKey: toDateKeyFromDate(new Date(args.now.getTime() + DAY_MS), args.timezone),
      label: "mañana"
    };
  }

  const ymd = args.normalized.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (!isValidDateParts(year, month, day)) return undefined;
    return {
      type: "day",
      dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: `el ${day} de ${monthNumberToLabel(month)}`
    };
  }

  const dmy = args.normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const fallbackYear = currentDatePartsInTimezone(args.now, args.timezone).year;
    const year = dmy[3] ? Number(dmy[3]) : fallbackYear;
    if (!isValidDateParts(year, month, day)) return undefined;
    const withYear = dmy[3] ? ` de ${year}` : "";
    return {
      type: "day",
      dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: `el ${day} de ${monthNumberToLabel(month)}${withYear}`
    };
  }

  const match = args.normalized.match(/\b(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = monthNameToNumber(match[2]);
  if (!month) return undefined;

  const fallbackYear = currentDatePartsInTimezone(args.now, args.timezone).year;
  const year = match[3] ? Number(match[3]) : fallbackYear;
  if (!isValidDateParts(year, month, day)) return undefined;
  const withYear = match[3] ? ` de ${year}` : "";
  return {
    type: "day",
    dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    label: `el ${day} de ${monthNumberToLabel(month)}${withYear}`
  };
}

function parseOrderReportWeekPeriod(args: {
  normalized: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  if (/\b(siguiente\s+semana|semana\s+siguiente|proxima\s+semana|semana\s+proxima)\b/.test(args.normalized)) {
    return {
      type: "week",
      anchorDateKey: toDateKeyFromDate(new Date(args.now.getTime() + 7 * DAY_MS), args.timezone),
      label: "la siguiente semana"
    };
  }

  if (/\b(esta\s+semana|1\s+semana|una\s+semana|semana)\b/.test(args.normalized)) {
    return {
      type: "week",
      anchorDateKey: toDateKeyFromDate(args.now, args.timezone),
      label: "esta semana"
    };
  }

  return undefined;
}

function parseOrderReportMonthPeriod(args: {
  normalized: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  const current = currentDatePartsInTimezone(args.now, args.timezone);

  const byName = args.normalized.match(/\b(?:el\s+)?(?:de(?:l)?\s+)?mes\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);
  if (byName) {
    const month = monthNameToNumber(byName[1]);
    if (!month) return undefined;
    const year = byName[2] ? Number(byName[2]) : current.year;
    return {
      type: "month",
      year,
      month,
      label: byName[2] ? `mes de ${monthNumberToLabel(month)} ${year}` : `mes de ${monthNumberToLabel(month)}`
    };
  }

  if (/\b(mes\s+siguiente|siguiente\s+mes|proximo\s+mes|mes\s+proximo)\b/.test(args.normalized)) {
    const nextMonth = current.month === 12 ? 1 : current.month + 1;
    const year = current.month === 12 ? current.year + 1 : current.year;
    return {
      type: "month",
      year,
      month: nextMonth,
      label: "el mes siguiente"
    };
  }

  if (/\beste\s+mes\b|\bmes\b/.test(args.normalized)) {
    return {
      type: "month",
      year: current.year,
      month: current.month,
      label: "este mes"
    };
  }

  return undefined;
}

function parseOrderReportYearPeriod(args: {
  normalized: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  const current = currentDatePartsInTimezone(args.now, args.timezone);

  if (/\beste\s+ano\b|\bano\b/.test(args.normalized)) {
    return {
      type: "year",
      year: current.year,
      label: "este año"
    };
  }

  return undefined;
}

function hasOrderReportPeriodHint(normalized: string): boolean {
  return /\b(hoy|manana|semana|mes|ano)\b/.test(normalized) || /\b\d{1,2}\s+de\s+[a-z]+\b/.test(normalized);
}

function parseOrderReportPeriodCore(args: {
  normalized: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  const dayPeriod = parseOrderReportDayPeriod(args);
  if (dayPeriod) return dayPeriod;

  const weekPeriod = parseOrderReportWeekPeriod(args);
  if (weekPeriod) return weekPeriod;

  const monthPeriod = parseOrderReportMonthPeriod(args);
  if (monthPeriod) return monthPeriod;

  const yearPeriod = parseOrderReportYearPeriod(args);
  if (yearPeriod) return yearPeriod;

  return undefined;
}

function detectOrderReportPeriod(args: {
  text: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  const normalized = normalizeForMatch(args.text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  if (!hasOrderWord) return undefined;

  const hasPeriodHint = hasOrderReportPeriodHint(normalized);
  if (!hasPeriodHint) return undefined;

  const hasQueryVerb = /\b(que|cuales|dame|mostrar|muestrame|ver|lista|listar|tengo|recuerdame|consulta|consultar)\b/.test(
    normalized
  );
  const hasPlural = /\bpedidos\b/.test(normalized);
  const startsAsCreateOrder = /^\s*pedido\b/.test(normalized);

  if (startsAsCreateOrder && !hasQueryVerb && !hasPlural) return undefined;
  if (!hasQueryVerb && !hasPlural) return undefined;

  return parseOrderReportPeriodCore({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
}

function detectOrderReportRequestWithoutPeriod(args: {
  text: string;
  now: Date;
  timezone: string;
}): boolean {
  const normalized = normalizeForMatch(args.text);
  const hasPluralOrders = /\bpedidos\b/.test(normalized);
  if (!hasPluralOrders) return false;

  if (hasOrderReportPeriodHint(normalized)) return false;

  const hasReportHint = /\b(reporte|reporta|resumen|consulta|consultar|dame|mostrar|muestrame|ver|lista|listar)\b/.test(
    normalized
  );
  if (!hasReportHint) return false;

  const startsAsCreateOrder = /^\s*pedido\b/.test(normalized);
  if (startsAsCreateOrder) return false;

  return detectOrderReportPeriod(args) == null;
}

function detectOrderReportPeriodFromClarification(args: {
  text: string;
  now: Date;
  timezone: string;
}): OrderReportPeriod | undefined {
  const normalized = normalizeForMatch(args.text);
  return parseOrderReportPeriodCore({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
}

function detectOrderLookupQuery(text: string): string | undefined {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  if (!hasOrderWord) return undefined;

  const hasPeriodHint = /\b(hoy|manana|semana|mes|ano)\b/.test(normalized) || /\b\d{1,2}\s+de\s+[a-z]+\b/.test(normalized);
  if (hasPeriodHint) return undefined;

  const hasLookupVerb = /\b(busca|buscar|consulta|consultar|estado|estatus|status|folio|id|detalle|ver|muestrame|dame)\b/.test(
    normalized
  );
  if (!hasLookupVerb) return undefined;

  const idMatch = normalized.match(/\b(?:folio|id|operation_id|operacion)\s*[:=]?\s*([a-z0-9_-]{3,})\b/);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  const deMatch = normalized.match(/\bpedidos?\s+de\s+(.+?)\s*$/);
  if (deMatch?.[1]) {
    const value = deMatch[1].trim();
    if (value.length >= 2) return value;
  }

  const porMatch = normalized.match(/\bpedidos?\s+por\s+(.+?)\s*$/);
  if (porMatch?.[1]) {
    const value = porMatch[1].trim();
    if (value.length >= 2) return value;
  }

  return undefined;
}

function detectOrderLookupRequestWithoutQuery(text: string): boolean {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  if (!hasOrderWord) return false;

  const hasPeriodHint = /\b(hoy|manana|semana|mes|ano)\b/.test(normalized) || /\b\d{1,2}\s+de\s+[a-z]+\b/.test(normalized);
  if (hasPeriodHint) return false;

  const hasLookupVerb = /\b(busca|buscar|consulta|consultar|estado|estatus|status|folio|id|detalle|ver|muestrame|dame)\b/.test(
    normalized
  );
  if (!hasLookupVerb) return false;

  return detectOrderLookupQuery(text) == null;
}

function detectOrderStatusQuery(text: string): string | undefined {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  if (!hasOrderWord) return undefined;

  const hasStatusHint = /\b(estado|estatus|status)\b/.test(normalized);
  if (!hasStatusHint) return undefined;

  const hasPeriodHint = /\b(hoy|manana|semana|mes|ano)\b/.test(normalized) || /\b\d{1,2}\s+de\s+[a-z]+\b/.test(normalized);
  if (hasPeriodHint) return undefined;

  const idMatch = normalized.match(/\b(?:folio|id|operation_id|operacion)\s*[:=]?\s*([a-z0-9_-]{3,})\b/);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  const deMatch = normalized.match(/\bpedidos?\s+de\s+(.+?)\s*$/);
  if (deMatch?.[1]) {
    const value = deMatch[1].trim();
    if (value.length >= 2) return value;
  }

  const pedidoDeMatch = normalized.match(/\bpedido\s+de\s+(.+?)\s*$/);
  if (pedidoDeMatch?.[1]) {
    const value = pedidoDeMatch[1].trim();
    if (value.length >= 2) return value;
  }

  return undefined;
}

function detectOrderStatusRequestWithoutQuery(text: string): boolean {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  if (!hasOrderWord) return false;

  const hasStatusHint = /\b(estado|estatus|status)\b/.test(normalized);
  if (!hasStatusHint) return false;

  const hasPeriodHint = /\b(hoy|manana|semana|mes|ano)\b/.test(normalized) || /\b\d{1,2}\s+de\s+[a-z]+\b/.test(normalized);
  if (hasPeriodHint) return false;

  return detectOrderStatusQuery(text) == null;
}

function hasOrderUpdatePatch(value: unknown): boolean {
  return isObjectRecord(value) && Object.keys(value).length > 0;
}

function normalizeOrderUpdateLookupCandidate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let out = value.trim();
  if (!out) return undefined;

  const separators = [",", ";", "."];
  for (const separator of separators) {
    const idx = out.indexOf(separator);
    if (idx > 0) {
      out = out.slice(0, idx).trim();
    }
  }

  const patchTokenIndex = out.search(/\b(cantidad|fecha|estado|total|producto|direccion|notas?|tipo|envio)\b/);
  if (patchTokenIndex > 1) {
    out = out.slice(0, patchTokenIndex).trim();
  }

  out = out.replace(/^(de|para)\s+/, "").trim();
  return out.length >= 2 ? out : undefined;
}

function extractOrderUpdateLookupQuery(text: string): string | undefined {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasMutationVerb = /\b(actualiza|actualizar|actualizacion|modifica|modificar|cambia|cambiar)\b/.test(normalized);
  if (!hasOrderWord || !hasMutationVerb) return undefined;

  const hasExplicitReference = /\b(?:folio|id|operation_id|operacion)\s*[:=]?\s*[a-z0-9_-]{3,}\b/.test(normalized);
  if (hasExplicitReference) return undefined;

  const deMatch = normalizeOrderUpdateLookupCandidate(normalized.match(/\bpedidos?\s+de\s+(.+?)\s*$/)?.[1]);
  if (deMatch) return deMatch;

  const paraMatch = normalizeOrderUpdateLookupCandidate(normalized.match(/\bpedidos?\s+para\s+(.+?)\s*$/)?.[1]);
  if (paraMatch) return paraMatch;

  let fallback = normalized
    .replace(/\{[\s\S]*\}/g, " ")
    .replace(/\b(actualiza|actualizar|actualizacion|modifica|modificar|cambia|cambiar)\b/g, " ")
    .replace(/\bpedidos?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeOrderUpdateLookupCandidate(fallback);
}

function normalizePaymentRecordLookupCandidate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let out = value.trim();
  if (!out) return undefined;

  const separators = [",", ";", "."];
  for (const separator of separators) {
    const idx = out.indexOf(separator);
    if (idx > 0) {
      out = out.slice(0, idx).trim();
    }
  }

  const paymentTokenIndex = out.search(/\b(pagado|pendiente|parcial|abono|pago|monto|metodo|nota)\b/);
  if (paymentTokenIndex > 1) {
    out = out.slice(0, paymentTokenIndex).trim();
  }

  out = out.replace(/^(de|para)\s+/, "").trim();
  return out.length >= 2 ? out : undefined;
}

function extractPaymentRecordLookupQuery(text: string): string | undefined {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasMutationVerb = /\b(registra|registrar|marca|marcar|aplica|aplicar|abona|abonar|liquida|liquidar)\b/.test(normalized);
  const hasPaymentHint = /\b(pago|abono|liquidacion)\b/.test(normalized) || /\bestado\s+de\s+pago\b/.test(normalized);
  if (!hasOrderWord || !hasMutationVerb || !hasPaymentHint) return undefined;

  const hasExplicitReference = /\b(?:folio|id|operation_id|operacion)\s*[:=]?\s*[a-z0-9_-]{3,}\b/.test(normalized);
  if (hasExplicitReference) return undefined;

  const deMatch = normalizePaymentRecordLookupCandidate(normalized.match(/\bpedidos?\s+de\s+(.+?)\s*$/)?.[1]);
  if (deMatch) return deMatch;

  const paraMatch = normalizePaymentRecordLookupCandidate(normalized.match(/\bpedidos?\s+para\s+(.+?)\s*$/)?.[1]);
  if (paraMatch) return paraMatch;

  let fallback = normalized
    .replace(/\{[\s\S]*\}/g, " ")
    .replace(/\b(registra|registrar|marca|marcar|aplica|aplicar|abona|abonar|liquida|liquidar)\b/g, " ")
    .replace(/\b(pago|abono|liquidacion)\b/g, " ")
    .replace(/\bpedidos?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizePaymentRecordLookupCandidate(fallback);
}

function extractOrderCancelLookupQuery(text: string): string | undefined {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasCancelVerb = /\b(cancela|cancelar|cancelame|anula|anular)\b/.test(normalized);
  if (!hasOrderWord || !hasCancelVerb) return undefined;

  const hasExplicitReference = /\b(?:folio|id|operation_id|operacion)\s*[:=]?\s*[a-z0-9_-]{3,}\b/.test(normalized);
  if (hasExplicitReference) return undefined;

  const deMatch = normalized.match(/\bpedidos?\s+de\s+(.+?)\s*$/)?.[1]?.trim();
  if (deMatch && deMatch.length >= 2) return deMatch;

  const paraMatch = normalized.match(/\bpedidos?\s+para\s+(.+?)\s*$/)?.[1]?.trim();
  if (paraMatch && paraMatch.length >= 2) return paraMatch;

  const fallback = normalized
    .replace(/\{[\s\S]*\}/g, " ")
    .replace(/\bmotivo\s*[:=]\s*.+$/g, " ")
    .replace(/\b(cancela|cancelar|cancelame|anula|anular)\b/g, " ")
    .replace(/\bpedidos?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (fallback.length >= 2) return fallback;

  return undefined;
}

function parseOrderDateMs(value: string | undefined): number | undefined {
  if (!value || value.trim().length === 0) return undefined;
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;

  const normalized = value.replace(/\s+/, "T");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildOrderCancelTimingWarning(args: {
  fecha_hora_entrega?: string;
  fecha_hora_entrega_iso?: string;
  nowMs: number;
}): string | undefined {
  const targetMs = parseOrderDateMs(args.fecha_hora_entrega_iso) ?? parseOrderDateMs(args.fecha_hora_entrega);
  if (targetMs == null) return undefined;
  const diffMs = targetMs - args.nowMs;
  if (diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000) {
    return "Advertencia: este pedido tiene entrega muy cercana (<= 2 horas).";
  }
  return undefined;
}

function hasShoppingListHint(normalized: string): boolean {
  return (
    /\b(insumos|surtir|surtido|compras|shopping)\b/.test(normalized) ||
    /\blista\s+de\s+(insumos|compras)\b/.test(normalized) ||
    /\bque\s+necesito\s+comprar\b/.test(normalized)
  );
}

function hasMeaningfulLookupQuery(value: string): boolean {
  const normalized = normalizeForMatch(value);
  if (normalized.length < 2) return false;
  if (/^(pedido|pedidos|insumos|lista|compras|surtir)$/.test(normalized)) return false;
  return true;
}

function detectShoppingListScope(args: {
  text: string;
  now: Date;
  timezone: string;
}): ShoppingListScope | undefined {
  const normalized = normalizeForMatch(args.text);
  if (!hasShoppingListHint(normalized)) return undefined;

  const dayPeriod = parseOrderReportDayPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (dayPeriod && dayPeriod.type === "day") {
    return {
      type: "day",
      dateKey: dayPeriod.dateKey,
      label: dayPeriod.label
    };
  }

  const weekPeriod = parseOrderReportWeekPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (weekPeriod && weekPeriod.type === "week") {
    return {
      type: "week",
      anchorDateKey: weekPeriod.anchorDateKey,
      label: weekPeriod.label
    };
  }

  const ref =
    normalized.match(/\b(?:folio|operation_id|operacion|id)\s*[:=]?\s*([a-z0-9_-]{3,})\b/)?.[1] ??
    normalized.match(/\bpedido\s*[:=]?\s*([a-z0-9_-]{3,})\b/)?.[1];
  if (ref && hasMeaningfulLookupQuery(ref)) {
    return {
      type: "order_ref",
      reference: ref,
      label: `pedido ${ref}`
    };
  }

  const deMatch = normalized.match(/\b(?:de|del|para|por)\s+(.+?)\s*$/)?.[1]?.trim();
  if (deMatch && hasMeaningfulLookupQuery(deMatch)) {
    return {
      type: "lookup",
      query: deMatch,
      label: `"${deMatch}"`
    };
  }

  return undefined;
}

function detectShoppingListRequestWithoutScope(args: {
  text: string;
  now: Date;
  timezone: string;
}): boolean {
  const normalized = normalizeForMatch(args.text);
  if (!hasShoppingListHint(normalized)) return false;
  return detectShoppingListScope(args) == null;
}

function hasScheduleDayHint(normalized: string): boolean {
  return /\b(agenda|horario|cronograma|programacion|plan\s+del\s+dia|dia\s+de\s+trabajo)\b/.test(normalized);
}

function detectScheduleDayPeriod(args: {
  text: string;
  now: Date;
  timezone: string;
}): ScheduleDayFilter | undefined {
  const normalized = normalizeForMatch(args.text);
  if (!hasScheduleDayHint(normalized)) return undefined;

  const dayPeriod = parseOrderReportDayPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (!dayPeriod || dayPeriod.type !== "day") return undefined;

  return {
    type: "day",
    dateKey: dayPeriod.dateKey,
    label: dayPeriod.label
  };
}

function detectScheduleDayRequestWithoutScope(args: {
  text: string;
  now: Date;
  timezone: string;
}): boolean {
  const normalized = normalizeForMatch(args.text);
  if (!hasScheduleDayHint(normalized)) return false;
  return detectScheduleDayPeriod(args) == null;
}

function detectAdminHealthRequest(text: string): boolean {
  const normalized = normalizeForMatch(text);

  const hasHealthHint = /\b(health|healthcheck|salud|estado)\b/.test(normalized);
  if (!hasHealthHint) return false;

  const hasAdminContext = /\b(admin|bot|sistema|runtime)\b/.test(normalized);
  if (!hasAdminContext) return false;

  return (
    /\badmin\b.*\b(health|salud|estado)\b/.test(normalized) ||
    /\b(health|salud|estado)\b.*\badmin\b/.test(normalized) ||
    /\b(estado|salud)\s+(del\s+)?(bot|sistema|runtime)\b/.test(normalized) ||
    /\bhealthcheck\b/.test(normalized)
  );
}

function detectAdminConfigViewRequest(text: string): boolean {
  const normalized = normalizeForMatch(text);

  const hasConfigHint = /\b(config|configuracion|configuración|settings|ajustes)\b/.test(normalized);
  if (!hasConfigHint) return false;

  const hasAdminContext = /\b(admin|bot|sistema|runtime)\b/.test(normalized);
  if (!hasAdminContext) return false;

  return (
    /\badmin\b.*\b(config|configuracion|configuración|settings|ajustes)\b/.test(normalized) ||
    /\b(config|configuracion|configuración|settings|ajustes)\b.*\badmin\b/.test(normalized) ||
    /\b(config|configuracion|configuración|settings|ajustes)\s+(del\s+)?(bot|sistema|runtime)\b/.test(normalized) ||
    /\b(ver|mostrar|mostrarme|consulta|consultar)\b.*\b(config|configuracion|configuración|settings|ajustes)\b/.test(
      normalized
    )
  );
}

type DetectedCodeReviewGraphRequest =
  | {
    requested: false;
  }
  | {
    requested: true;
    operation?: CodeReviewGraphOperation;
    repo_root?: string;
    target_file?: string;
    line_number?: number;
    max_depth?: number;
    include_source?: boolean;
  };

function parseCodeReviewGraphCommand(text: string): DetectedCodeReviewGraphRequest {
  const normalized = normalizeForMatch(text);
  const requested = /\b(crg|code[\s-]?review[\s-]?graph|review[\s-]?graph)\b/.test(normalized);
  if (!requested) return { requested: false };

  const hasBuildHint = /\b(build|rebuild|actualiza|actualizar|update|reconstruye|reconstruir)\b/.test(normalized);
  const hasImpactHint = /\b(impact|blast|radio|afecta|afectados)\b/.test(normalized);
  const hasContextHint = /\b(context|contexto|review|revision|revisión)\b/.test(normalized);

  let operation: CodeReviewGraphOperation | undefined;
  if (hasImpactHint) operation = "get_impact_radius";
  else if (hasContextHint) operation = "get_review_context";
  else if (hasBuildHint) operation = "build_or_update_graph";

  const fileMatch =
    text.match(/`([^`]+)`/)?.[1] ??
    text.match(/"([^"]+)"/)?.[1] ??
    text.match(/'([^']+)'/)?.[1] ??
    text.match(/\b(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+\.[A-Za-z0-9_-]{1,10}\b/)?.[0];
  const target_file = trimString(fileMatch);

  const lineNumberMatch = normalized.match(/\b(?:linea|line|l)\s*[:#]?\s*(\d{1,6})\b/);
  const line_number = lineNumberMatch?.[1] ? Number(lineNumberMatch[1]) : undefined;

  const depthMatch = normalized.match(/\b(?:depth|profundidad)\s*[:=]?\s*(\d{1,2})\b/);
  const max_depth = depthMatch?.[1] ? Number(depthMatch[1]) : undefined;

  const repoMatch = text.match(/\brepo\s*[:=]?\s*([^\s]+)/i)?.[1];
  const repo_root = trimString(repoMatch);

  let include_source: boolean | undefined;
  if (/\b(include\s+source|source\s+on|con\s+source|incluye\s+codigo|mostrar\s+codigo)\b/.test(normalized)) {
    include_source = true;
  } else if (/\b(no\s+source|source\s+off|sin\s+source|sin\s+codigo)\b/.test(normalized)) {
    include_source = false;
  }

  return {
    requested: true,
    operation,
    repo_root,
    target_file,
    line_number: Number.isInteger(line_number) && (line_number ?? 0) > 0 ? line_number : undefined,
    max_depth: Number.isInteger(max_depth) && (max_depth ?? 0) > 0 ? max_depth : undefined,
    include_source
  };
}

function detectQuoteOrderQuery(text: string): string | undefined {
  const normalized = normalizeForMatch(text);
  const hasQuoteVerb = /\b(cotiza|cotizar|cotizacion|cuanto\s+cuesta|cuanto\s+sale|cuanto\s+vale|presupuesto|precio\s+de)\b/.test(
    normalized
  );
  if (!hasQuoteVerb) return undefined;

  const query = text.trim();
  if (query.length < 3) return undefined;
  return query;
}

function parseQuoteQuantityFromText(text: string): number | undefined {
  const normalized = normalizeForMatch(text);
  const raw =
    normalized.match(/^(\d{1,3})$/)?.[1] ??
    normalized.match(/\bx\s*(\d{1,3})\b/)?.[1] ??
    normalized.match(/\b(\d{1,3})\s*(?:piezas?|porciones?|unidades?|cupcakes?|pasteles?)\b/)?.[1] ??
    normalized.match(/\b(?:cantidad|piezas?|porciones?|unidades?)\s*(?:de|:|=)?\s*(\d{1,3})\b/)?.[1];

  if (!raw) return undefined;
  const qty = Number(raw);
  if (!Number.isInteger(qty) || qty <= 0) return undefined;
  return qty;
}

function parseQuoteShippingFromText(text: string): "envio_domicilio" | "recoger_en_tienda" | undefined {
  const normalized = normalizeForMatch(text);
  if (/\b(recoger|recoge|retiro|en tienda|paso por)\b/.test(normalized)) {
    return "recoger_en_tienda";
  }
  if (/\b(envio|enviar|domicilio|a domicilio|entrega)\b/.test(normalized)) {
    return "envio_domicilio";
  }
  return undefined;
}

const QUOTE_CUSTOMIZATION_FIELDS: QuoteCustomizationField[] = [
  "quote_sabor_pan",
  "quote_sabor_relleno",
  "quote_tipo_betun",
  "quote_topping"
];

function hasQuotePanInfo(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return /\b(sabor(?:\s+de)?\s+pan|pan\s+de|sin\s+pan)\b/.test(normalized);
}

function hasQuoteFillingInfo(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return /\b(relleno|sin\s+relleno)\b/.test(normalized);
}

function hasQuoteFrostingInfo(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return /\b(betun|buttercream|chantilly|merengue|ganache|frosting|sin\s+betun)\b/.test(normalized);
}

function hasQuoteToppingInfo(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return /\b(topping|topper|chispas|sprinkles|fruta|fresas|nuez|almendra|sin\s+topping)\b/.test(normalized);
}

function nextQuoteCustomizationField(query: string): QuoteCustomizationField | undefined {
  if (!hasQuotePanInfo(query)) return "quote_sabor_pan";
  if (!hasQuoteFillingInfo(query)) return "quote_sabor_relleno";
  if (!hasQuoteFrostingInfo(query)) return "quote_tipo_betun";
  if (!hasQuoteToppingInfo(query)) return "quote_topping";
  return undefined;
}

function quotePromptForField(field: QuoteCustomizationField, suggestions?: string[]): string {
  let prompt = "¿Qué topping llevará?";
  if (field === "quote_sabor_pan") prompt = "¿Qué sabor será el pan?";
  if (field === "quote_sabor_relleno") prompt = "¿Qué sabor de relleno deseas?";
  if (field === "quote_tipo_betun") prompt = "¿Qué tipo de betún quieres?";

  if (!suggestions || suggestions.length === 0) return prompt;
  return `${prompt}\nOpciones: ${suggestions.join(", ")}.`;
}

function quoteHintLabelForField(field: QuoteCustomizationField): string {
  if (field === "quote_sabor_pan") return "sabor de pan";
  if (field === "quote_sabor_relleno") return "relleno";
  if (field === "quote_tipo_betun") return "betun";
  return "topping";
}

function isQuoteSkipAnswer(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return /\b(sin|ninguno|ninguna|n\/a|no aplica|omitir|skip)\b/.test(normalized);
}

function parseQuoteCustomizationAnswer(text: string): string | undefined {
  const answer = text.trim();
  if (answer.length < 2) return undefined;
  return answer;
}

function appendQuoteHint(query: string, hint: string): string {
  const merged = `${query} ${hint}`.trim();
  return merged.replace(/\s+/g, " ");
}

const QUOTE_TO_ORDER_CONFIRM_FIELD = "quote_to_order_confirm";
const QUOTE_TO_ORDER_RECONFIRM_FIELD = "quote_to_order_reconfirm";
const QUOTE_SHIPPING_ZONE_FIELD = "quote_shipping_zone";
const QUOTE_MODIFIER_FIELD = "quote_modifier";

type StoredQuoteSnapshot = {
  total: number;
  currency: string;
  lines: string[];
};

function buildQuoteLineFingerprint(line: QuoteOrderResult["lines"][number]): string {
  const amount = Math.round(line.amount * 100) / 100;
  return `${line.kind}|${normalizeForMatch(line.key)}|${amount.toFixed(2)}`;
}

function buildStoredQuoteSnapshot(quote: QuoteOrderResult): StoredQuoteSnapshot {
  return {
    total: Math.round(quote.total * 100) / 100,
    currency: quote.currency,
    lines: quote.lines.map((line) => buildQuoteLineFingerprint(line))
  };
}

function parseStoredQuoteSnapshot(value: unknown): StoredQuoteSnapshot | undefined {
  if (!isObjectRecord(value)) return undefined;
  const total = typeof value.total === "number" ? value.total : Number.NaN;
  const currency = trimString(value.currency);
  const lines = Array.isArray(value.lines)
    ? value.lines
      .filter((line): line is string => typeof line === "string")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    : [];
  if (!Number.isFinite(total) || !currency) return undefined;
  return {
    total: Math.round(total * 100) / 100,
    currency,
    lines
  };
}

function hasQuoteSnapshotChanges(previous: StoredQuoteSnapshot, current: StoredQuoteSnapshot): boolean {
  if (previous.currency !== current.currency) return true;
  if (previous.total !== current.total) return true;
  if (previous.lines.length !== current.lines.length) return true;
  for (let i = 0; i < previous.lines.length; i += 1) {
    if (previous.lines[i] !== current.lines[i]) return true;
  }
  return false;
}

function quoteShippingZonePrompt(): string {
  return "Para envío a domicilio necesito la zona para cotizar exacto. Ejemplo: Villa de Alvarez, Colima centro o Comala.";
}

function quoteModifierClarificationPrompt(): string {
  return "Necesito confirmar los extras/opciones. Escríbeme exactamente cuál quieres agregar (ej. decoracion personalizada) o responde sin extras.";
}

function quoteToOrderConfirmPrompt(): string {
  return "¿Deseas crear el pedido con esta cotización? Responde confirmar o cancelar.";
}

function formatQuoteReconfirmationPrompt(args: {
  previous: StoredQuoteSnapshot;
  current: QuoteOrderResult;
}): string {
  const currentSnapshot = buildStoredQuoteSnapshot(args.current);
  const totalChanged = args.previous.total !== currentSnapshot.total || args.previous.currency !== currentSnapshot.currency;
  const linesChanged = args.previous.lines.length !== currentSnapshot.lines.length ||
    args.previous.lines.some((line, idx) => line !== currentSnapshot.lines[idx]);

  const changes: string[] = [];
  if (totalChanged) {
    changes.push(`total: ${args.previous.total} ${args.previous.currency} -> ${currentSnapshot.total} ${currentSnapshot.currency}`);
  }
  if (linesChanged) {
    changes.push("líneas de la cotización");
  }

  const changedSummary = changes.length > 0 ? changes.join(" | ") : "la cotización";
  return [
    `La cotización cambió al momento de confirmar (${changedSummary}).`,
    formatQuoteOrderReply(args.current),
    quoteToOrderConfirmPrompt()
  ].join("\n\n");
}

function extractQuoteCustomizationSegment(args: {
  query: string;
  labelPattern: RegExp;
  nextLabels: string[];
}): string | undefined {
  const normalized = normalizeForMatch(args.query);
  const match = normalized.match(args.labelPattern);
  if (!match?.[1]) return undefined;

  let value = match[1].trim();
  for (const nextLabel of args.nextLabels) {
    const index = value.indexOf(` ${nextLabel} `);
    if (index >= 0) {
      value = value.slice(0, index).trim();
      break;
    }
    if (value.endsWith(` ${nextLabel}`)) {
      value = value.slice(0, value.length - (` ${nextLabel}`).length).trim();
      break;
    }
  }

  return value.length > 0 ? value : undefined;
}

function parseOrderFlavorPanFromQuery(query: string): "vainilla" | "chocolate" | "red_velvet" | "otro" | undefined {
  const segment = extractQuoteCustomizationSegment({
    query,
    labelPattern: /sabor(?:\s+de)?\s+pan\s+(.+)$/,
    nextLabels: ["relleno", "betun", "topping"]
  });
  if (!segment || /\bsin\s+pan\b/.test(segment)) return undefined;
  if (/\bred\s*velvet\b/.test(segment)) return "red_velvet";
  if (/\bchocolate\b/.test(segment)) return "chocolate";
  if (/\bvainilla\b/.test(segment)) return "vainilla";
  return "otro";
}

function parseOrderFlavorFillingFromQuery(query: string): "cajeta" | "mermelada_fresa" | "oreo" | undefined {
  const segment = extractQuoteCustomizationSegment({
    query,
    labelPattern: /\brelleno\s+(.+)$/,
    nextLabels: ["betun", "topping"]
  });
  if (!segment || /\bsin\s+relleno\b/.test(segment)) return undefined;
  if (/\boreo\b/.test(segment)) return "oreo";
  if (/\bcajeta\b/.test(segment)) return "cajeta";
  if (/\b(mermelada\s+de\s+fresa|mermelada\s+fresa|fresa)\b/.test(segment)) return "mermelada_fresa";
  return undefined;
}

function buildOrderPayloadFromQuote(args: { query: string; quote: QuoteOrderResult; quoteId?: string }): Record<string, unknown> {
  const nonBaseLabels = args.quote.lines.filter((line) => line.kind !== "base").map((line) => line.label.trim()).filter((label) => label.length > 0);
  const notesBase = args.quoteId ? `Creado desde cotizacion (quote_id: ${args.quoteId})` : "Creado desde cotizacion";
  const payload: Record<string, unknown> = {
    producto: args.quote.product.name,
    cantidad: args.quote.quantity,
    total: args.quote.total,
    moneda: args.quote.currency,
    estado_pago: "pendiente",
    notas: notesBase
  };

  if (args.quote.shippingMode === "envio_domicilio" || args.quote.shippingMode === "recoger_en_tienda") {
    payload.tipo_envio = args.quote.shippingMode;
  }

  if (nonBaseLabels.length > 0) {
    payload.descripcion_producto = nonBaseLabels.join(", ");
  }

  const saborPan = parseOrderFlavorPanFromQuery(args.query);
  if (saborPan) {
    payload.sabor_pan = saborPan;
  }

  const saborRelleno = parseOrderFlavorFillingFromQuery(args.query);
  if (saborRelleno) {
    payload.sabor_relleno = saborRelleno;
  }

  return payload;
}

function formatQuoteReplyWithOrderCta(quote: QuoteOrderResult): string {
  return `${formatQuoteOrderReply(quote)}\n\n${quoteToOrderConfirmPrompt()}`;
}

function parseQuoteOptionSuggestions(value: unknown): QuoteOptionSuggestions | undefined {
  if (!isObjectRecord(value)) return undefined;

  const out: QuoteOptionSuggestions = {};
  for (const field of QUOTE_CUSTOMIZATION_FIELDS) {
    const raw = value[field];
    if (!Array.isArray(raw)) continue;

    const seen = new Set<string>();
    const labels = raw
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .filter((item) => {
        const normalized = normalizeForMatch(item);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });

    if (labels.length > 0) {
      out[field] = labels;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function formatOrderReportReply(report: OrderReportResult): string {
  const label = report.period.label;
  const maxInconsistencies = 5;
  const inconsistencies = report.inconsistencies
    .slice(0, maxInconsistencies)
    .map((item, idx) => `${idx + 1}. ${item.reference}: fecha de entrega faltante o inválida (${item.detail})`);
  const inconsistenciesExtra = report.inconsistencies.length > inconsistencies.length
    ? `\n... y ${report.inconsistencies.length - inconsistencies.length} inconsistencias más`
    : "";
  const inconsistenciesBlock = report.inconsistencies.length > 0
    ? `\nInconsistencias (${report.inconsistencies.length}):\n${inconsistencies.join("\n")}${inconsistenciesExtra}`
    : "";

  if (report.total === 0) {
    return `No encontré pedidos para ${label}.${inconsistenciesBlock}\nRef: ${report.trace_ref}`;
  }

  const shown = report.orders;
  const lines = shown.map((order, idx) => {
    const qty = order.cantidad != null ? `x${order.cantidad}` : "x?";
    const total = order.total != null ? `${order.total}${order.moneda ? ` ${order.moneda}` : ""}` : "-";
    const payment = order.estado_pago ?? "-";
    const operationId = order.operation_id ?? "-";
    const estadoPedido = order.estado_pedido ?? "-";
    return `${idx + 1}. ${order.fecha_hora_entrega} | ${order.folio || "-"} | ${operationId} | ${order.nombre_cliente} | ${order.producto} ${qty} | pago:${payment} | ${total} | estado:${estadoPedido}`;
  });

  const extra = report.total > shown.length ? `\n... y ${report.total - shown.length} más` : "";
  return `Pedidos para ${label} (${report.total}):\n${lines.join("\n")}${extra}${inconsistenciesBlock}\nRef: ${report.trace_ref}`;
}

function formatOrderLookupReply(result: OrderLookupResult): string {
  if (result.total === 0) {
    return `No encontré pedidos para "${result.query}". Prueba con folio, operation_id o nombre del cliente.\nRef: ${result.trace_ref}`;
  }

  const shown = result.orders;
  const lines = shown.map((order, idx) => {
    const qty = order.cantidad != null ? `x${order.cantidad}` : "x?";
    const total = order.total != null ? `${order.total}${order.moneda ? ` ${order.moneda}` : ""}` : "-";
    const payment = order.estado_pago ?? "-";
    const operationId = order.operation_id ?? "-";
    return `${idx + 1}. ${order.folio || "-"} | ${operationId} | ${order.fecha_hora_entrega} | ${order.nombre_cliente} | ${order.producto} ${qty} | ${payment} | ${total}`;
  });

  const extra = result.total > shown.length ? `\n... y ${result.total - shown.length} más` : "";
  return `Pedidos encontrados para "${result.query}" (${result.total}):\n${lines.join("\n")}${extra}\nRef: ${result.trace_ref}`;
}

function formatOrderUpdateAmbiguousReply(args: { query: string; total: number; orders: OrderLookupResult["orders"] }): string {
  const maxRows = 5;
  const shown = args.orders.slice(0, maxRows);
  const lines = shown.map((order, idx) => {
    const operationId = order.operation_id ?? "-";
    return `${idx + 1}. folio:${order.folio || "-"} | op:${operationId} | ${order.nombre_cliente} | ${order.producto} | ${order.fecha_hora_entrega}`;
  });
  const extra = args.total > shown.length ? `\n... y ${args.total - shown.length} más` : "";
  return `Encontré ${args.total} pedidos para "${args.query}". Elige el correcto para actualizar:\n${lines.join("\n")}${extra}\nResponde con folio u operation_id.`;
}

function formatPaymentRecordAmbiguousReply(args: { query: string; total: number; orders: OrderLookupResult["orders"] }): string {
  const maxRows = 5;
  const shown = args.orders.slice(0, maxRows);
  const lines = shown.map((order, idx) => {
    const operationId = order.operation_id ?? "-";
    return `${idx + 1}. folio:${order.folio || "-"} | op:${operationId} | ${order.nombre_cliente} | ${order.producto} | ${order.fecha_hora_entrega}`;
  });
  const extra = args.total > shown.length ? `\n... y ${args.total - shown.length} más` : "";
  return `Encontré ${args.total} pedidos para "${args.query}". Elige el correcto para registrar el pago:\n${lines.join("\n")}${extra}\nResponde con folio u operation_id.`;
}

function formatOrderStatusReply(result: OrderStatusResult): string {
  if (result.total === 0) {
    return `No encontré el estado para "${result.query}". Prueba con folio, operation_id o nombre del cliente.\nRef: ${result.trace_ref}`;
  }

  const maxRows = 10;
  const shown = result.orders.slice(0, maxRows);
  const lines = shown.map((order, idx) => {
    const payment = order.estado_pago ?? "-";
    const total = order.total != null ? `${order.total}${order.moneda ? ` ${order.moneda}` : ""}` : "-";
    const operationId = order.operation_id ?? "-";
    return `${idx + 1}. ${order.folio || "-"} | ${operationId} | ${order.fecha_hora_entrega} | ${order.nombre_cliente} | ${order.producto} | pago:${payment} | estado:${order.estado_operativo} | ${total}`;
  });

  const extra = result.total > shown.length ? `\n... y ${result.total - shown.length} más. Puedes refinar con folio u operation_id.` : "";
  return `Estado de pedidos para "${result.query}" (${result.total}):\n${lines.join("\n")}${extra}\nRef: ${result.trace_ref}`;
}

function formatAdminHealthStatusLabel(status: AdminHealthResult["status"]): string {
  if (status === "ok") return "OK";
  if (status === "degraded") return "DEGRADED";
  return "ERROR";
}

function formatAdminHealthReply(result: AdminHealthResult): string {
  const checks = result.checks
    .slice(0, 12)
    .map((check, idx) => `${idx + 1}. ${check.name}: ${formatAdminHealthStatusLabel(check.status)} | ${check.detail}`);
  const checksBlock = checks.length > 0 ? `Checks:\n${checks.join("\n")}` : "Checks: sin datos";

  return [
    `Estado admin del bot: ${formatAdminHealthStatusLabel(result.status)}`,
    checksBlock,
    `Generado: ${result.generated_at}`,
    `Ref: ${result.trace_ref}`
  ].join("\n");
}

function formatEnabledLabel(value: boolean): string {
  return value ? "ON" : "OFF";
}

function formatConfiguredLabel(value: boolean): string {
  return value ? "SI" : "NO";
}

function formatAdminConfigViewReply(result: AdminConfigViewResult): string {
  const runtime = result.snapshot.runtime;
  const openclaw = result.snapshot.openclaw;
  const telegram = result.snapshot.telegram;
  const expense = result.snapshot.expense;
  const order = result.snapshot.order;
  const inventory = result.snapshot.inventory_consume;
  const web = result.snapshot.web;
  const crg = result.snapshot.code_review_graph;

  return [
    "Configuracion admin (sanitizada):",
    `Runtime: env=${runtime.node_env} | canal=${runtime.channel_mode} | tz=${runtime.timezone} | allowlist=${runtime.allowlist_size}`,
    `OpenClaw: ${formatEnabledLabel(openclaw.enabled)} | strict=${formatEnabledLabel(openclaw.strict)} | readonly=${formatEnabledLabel(openclaw.readonly_routing_enabled)} | quote=${formatEnabledLabel(openclaw.readonly_quote_enabled)}`,
    `Telegram: token_configurado=${formatConfiguredLabel(telegram.bot_token_configured)} | poll=${telegram.poll_interval_ms}ms`,
    `Connectors: expense_dry_run=${formatEnabledLabel(expense.dry_run)} | order_trello_dry_run=${formatEnabledLabel(order.trello.dry_run)} | order_sheets_dry_run=${formatEnabledLabel(order.sheets.dry_run)}`,
    `Inventory: enabled=${formatEnabledLabel(inventory.enabled)} | allow_negative=${formatEnabledLabel(inventory.allow_negative_stock)} | recipe_source=${inventory.recipe_source}`,
    `Web: chat=${formatEnabledLabel(web.chat_enabled)} | publish_dry_run=${formatEnabledLabel(web.publish.dry_run)} | webhook=${formatConfiguredLabel(web.publish.webhook_url_configured)}`,
    `CRG: enabled=${formatEnabledLabel(crg.enabled)} | allowlist=${crg.allowlist_count} | timeout=${crg.timeout_ms}ms`,
    `Generado: ${result.generated_at}`,
    `Ref: ${result.trace_ref}`
  ].join("\n");
}

function formatCodeReviewGraphOperationLabel(operation: CodeReviewGraphOperation): string {
  if (operation === "build_or_update_graph") return "build/update graph";
  if (operation === "get_impact_radius") return "impact radius";
  return "review context";
}

function formatCodeReviewGraphReply(result: CodeReviewGraphResult): string {
  const statusLabel = result.status === "ok" ? "OK" : "ERROR";
  const repoLabel = trimString(result.meta.repo_root) ?? "-";
  const durationMs = Number.isFinite(result.meta.duration_ms) ? Math.trunc(result.meta.duration_ms) : 0;
  const truncatedNote = result.meta.truncated ? "\nNota: la salida fue truncada por límite de seguridad." : "";

  return [
    `Code Review Graph: ${statusLabel} (${formatCodeReviewGraphOperationLabel(result.operation)})`,
    `Resumen: ${result.summary}`,
    `Repo: ${repoLabel}`,
    `Tiempo: ${durationMs}ms`,
    `Ref: ${result.trace_ref}${truncatedNote}`
  ].join("\n");
}

function formatCodeReviewGraphUsageReply(): string {
  return [
    "No pude identificar la operación de Code Review Graph.",
    "Usa uno de estos formatos:",
    "1) admin crg build",
    "2) admin crg impact `src/ruta/archivo.ts` depth 2",
    "3) admin crg context `src/ruta/archivo.ts` line 120"
  ].join("\n");
}

function formatShoppingListReply(result: ShoppingListResult): string {
  const label = result.scope.label;
  const manualIntervention = result.manualIntervention ?? [];
  const shownManual = manualIntervention.slice(0, 6);
  const manualLines = shownManual.map((item, idx) => {
    if (item.type === "invalid_quantity") {
      return `${idx + 1}. ${item.reference}: cantidad invalida. ${item.detail}`;
    }
    const target = item.product ?? item.reference;
    return `${idx + 1}. ${target}: ${item.detail}`;
  });
  const manualExtra = manualIntervention.length > shownManual.length
    ? `\n... y ${manualIntervention.length - shownManual.length} casos más`
    : "";
  const manualBlock = manualLines.length > 0
    ? `Intervención manual requerida:\n${manualLines.join("\n")}${manualExtra}`
    : "";
  const assumptions =
    result.assumptions.length > 0
      ? `Supuestos: ${result.assumptions.join(" ; ")}`
      : "";

  if (result.totalOrders === 0) {
    const lines = [`No encontré pedidos válidos para armar la lista de insumos (${label}).`];
    if (manualBlock) lines.push(manualBlock);
    if (assumptions) lines.push(assumptions);
    return lines.join("\n");
  }

  const maxSupplies = 12;
  const shownSupplies = result.supplies.slice(0, maxSupplies);
  const supplyLines = shownSupplies.map((supply, idx) => {
    const source = supply.sourceProducts.length > 0 ? ` [${supply.sourceProducts.join(", ")}]` : "";
    return `${idx + 1}. ${supply.item}: ${supply.amount} ${supply.unit}${source}`;
  });
  const supplyExtra = result.supplies.length > shownSupplies.length
    ? `\n... y ${result.supplies.length - shownSupplies.length} insumos más`
    : "";

  const productSummary = result.products
    .slice(0, 6)
    .map((item) => `${item.product} x${item.quantity}`)
    .join(" | ");
  const productsLine = `Productos considerados: ${productSummary}${result.products.length > 6 ? " | ..." : ""}`;
  const lines = [
    `Lista de insumos para ${label} (${result.totalOrders} pedidos):`,
    supplyLines.join("\n") + supplyExtra,
    productsLine
  ];
  if (manualBlock) lines.push(manualBlock);
  if (assumptions) lines.push(assumptions);

  return lines.join("\n");
}

function formatScheduleDayViewReply(result: ScheduleDayViewResult): string {
  const label = result.day.label;
  const maxInconsistencies = 8;
  const inconsistencies = result.inconsistencies.slice(0, maxInconsistencies).map((item, idx) =>
    `${idx + 1}. ${item.reference}: ${item.reason} (${item.affects})`
  );
  const inconsistenciesExtra = result.inconsistencies.length > inconsistencies.length
    ? `\n... y ${result.inconsistencies.length - inconsistencies.length} inconsistencias más`
    : "";
  const inconsistenciesBlock = result.inconsistencies.length > 0
    ? `\nInconsistencias (${result.inconsistencies.length}):\n${inconsistencies.join("\n")}${inconsistenciesExtra}`
    : "";

  if (result.totalOrders === 0) {
    return `No encontré pedidos para armar la agenda de ${label}.${inconsistenciesBlock}\nRef: ${result.trace_ref}`;
  }

  const deliveries = result.deliveries
    .slice(0, 20)
    .map((order, idx) => {
      const qty = order.cantidad_invalida ? "x? (cantidad inválida)" : order.cantidad > 0 ? `x${order.cantidad}` : "x?";
      const shipping = order.tipo_envio ?? "-";
      return `${idx + 1}. ${order.fecha_hora_entrega} | ${order.nombre_cliente || "-"} | ${order.producto} ${qty} | ${shipping}`;
    });
  const deliveriesExtra = result.deliveries.length > deliveries.length
    ? `\n... y ${result.deliveries.length - deliveries.length} entregas más`
    : "";

  const preparation = result.preparation
    .slice(0, 12)
    .map((item, idx) => `${idx + 1}. ${item.product}: x${item.quantity} (${item.orders} pedido(s))`);
  const preparationExtra = result.preparation.length > preparation.length
    ? `\n... y ${result.preparation.length - preparation.length} productos más`
    : "";

  const purchases = result.suggestedPurchases
    .slice(0, 12)
    .map((item, idx) => {
      const source = item.sourceProducts.length > 0 ? ` [${item.sourceProducts.join(", ")}]` : "";
      return `${idx + 1}. ${item.item}: ${item.amount} ${item.unit}${source}`;
    });
  const purchasesExtra = result.suggestedPurchases.length > purchases.length
    ? `\n... y ${result.suggestedPurchases.length - purchases.length} compras sugeridas más`
    : "";

  const assumptions = result.assumptions.length > 0 ? `\nSupuestos: ${result.assumptions.join(" ; ")}` : "";

  return [
    `Agenda del día para ${label} (${result.totalOrders} pedidos):`,
    `Entregas:\n${deliveries.join("\n")}${deliveriesExtra}`,
    `Preparación:\n${preparation.join("\n")}${preparationExtra}`,
    `Compras sugeridas:\n${purchases.join("\n")}${purchasesExtra}${assumptions}${inconsistenciesBlock}`,
    `Ref: ${result.trace_ref}`
  ].join("\n");
}

function formatQuoteOrderReply(result: QuoteOrderResult): string {
  const base = result.lines.find((line) => line.kind === "base");
  const nonBase = result.lines.filter((line) => line.kind !== "base");
  const lines: string[] = [];

  lines.push(`Cotizacion estimada (${result.currency}):`);
  lines.push(`Producto: ${result.product.name} (x${result.quantity})`);
  lines.push(`Base: ${base ? `${base.amount} ${result.currency}` : `0 ${result.currency}`}`);

  for (const line of nonBase) {
    lines.push(`+ ${line.label}: ${line.amount} ${result.currency}`);
  }

  lines.push(`Subtotal: ${result.subtotal} ${result.currency}`);
  lines.push(`Total estimado: ${result.total} ${result.currency}`);

  if (result.suggestedDeposit != null) {
    lines.push(`Anticipo sugerido: ${result.suggestedDeposit} ${result.currency}`);
  }
  if (result.quoteValidityHours != null) {
    lines.push(`Vigencia: ${result.quoteValidityHours} horas`);
  }
  if (result.referenceContext?.matched) {
    const average = result.referenceContext.averagePrice != null
      ? ` (promedio ref: ${result.referenceContext.averagePrice} ${result.currency})`
      : "";
    lines.push(`Referencias consultadas: ${result.referenceContext.matched}${average}`);
  }
  if (result.assumptions.length > 0) {
    lines.push(`Supuestos: ${result.assumptions.join(" | ")}`);
  }

  return lines.join("\n");
}

function normalizeTipoEnvioInput(raw: string): string {
  const value = raw.trim();
  const normalized = value.toLowerCase();

  if (normalized === "envio_domicilio" || normalized === "recoger_en_tienda") {
    return normalized;
  }

  if (/\b(dom(icilio)?|a domicilio|env[ií]o(?:\s+a)?\s+domicilio)\b/i.test(normalized)) {
    return "envio_domicilio";
  }

  if (/\b(recoger|recoge|retiro|en tienda|tienda)\b/i.test(normalized)) {
    return "recoger_en_tienda";
  }

  return value;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedValue(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = payload;

  for (const part of parts) {
    if (!isObjectRecord(cursor)) return undefined;
    cursor = cursor[part];
  }

  return cursor;
}

function setNestedValue(payload: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split(".");
  const root: Record<string, unknown> = { ...payload };
  let cursor: Record<string, unknown> = root;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const current = cursor[key];
    cursor[key] = isObjectRecord(current) ? { ...current } : {};
    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[parts[parts.length - 1]] = value;
  return root;
}

function parseInlineJsonObject(text: string): { ok: true; value: Record<string, unknown> } | { ok: false } | { ok: null } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return { ok: null };

  const raw = text.slice(start, end + 1).trim();
  try {
    const parsed = JSON.parse(raw);
    if (!isObjectRecord(parsed)) return { ok: false };
    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

async function parseWebRequest(text: string): Promise<ParseResult> {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();
  const action: WebPublishPayload["action"] = /\bpublicar\b/.test(lower)
    ? "publicar"
    : /\bmen[uú]\b/.test(lower)
      ? "menu"
      : "crear";

  const inline = parseInlineJsonObject(normalized);
  if (inline.ok === false) {
    return { ok: false, source: "fallback", error: "web_payload_json_invalid" };
  }

  const payload: Record<string, unknown> = { action };
  if (inline.ok === true) {
    payload.content = inline.value;
  } else if (action !== "publicar") {
    payload.content = {};

    const businessNameMatch = normalized.match(/\b(?:negocio|businessName|nombre)\s*[:=]\s*([^,\n|]+)/i);
    if (businessNameMatch?.[1]) {
      payload.content = setNestedValue(payload.content as Record<string, unknown>, "businessName", businessNameMatch[1].trim());
    }

    const whatsappMatch = normalized.match(/\b(?:whatsapp|wa)\s*[:=]?\s*([+0-9][0-9\s-]{6,})/i);
    if (whatsappMatch?.[1]) {
      payload.content = setNestedValue(payload.content as Record<string, unknown>, "whatsapp", whatsappMatch[1].trim());
    }
  }

  return { ok: true, source: "fallback", payload };
}

function validateWebPayloadDraft(payload: Record<string, unknown>):
  | { ok: true; data: WebPublishPayload }
  | { ok: false; missing: string[] } {
  const actionRaw = typeof payload.action === "string" ? payload.action.toLowerCase() : undefined;
  const action = actionRaw === "crear" || actionRaw === "menu" || actionRaw === "publicar" ? actionRaw : undefined;
  if (!action) {
    return { ok: false, missing: ["action"] };
  }

  const content = isObjectRecord(payload.content) ? { ...payload.content } : {};
  const missing: string[] = [];

  if (action === "crear") {
    const businessName = getNestedValue(content, "businessName");
    const whatsapp = getNestedValue(content, "whatsapp");
    if (typeof businessName !== "string" || businessName.trim().length === 0) {
      missing.push("content.businessName");
    }
    if (typeof whatsapp !== "string" || whatsapp.trim().length === 0) {
      missing.push("content.whatsapp");
    }
  }

  if (action === "menu") {
    const menuItems = Array.isArray(content.menuItems) ? content.menuItems : [];
    const catalogItems = Array.isArray(content.catalogItems) ? content.catalogItems : [];
    if (menuItems.length === 0 && catalogItems.length === 0) {
      missing.push("content.catalogItemsJson");
    }
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const out: WebPublishPayload = action === "publicar" && Object.keys(content).length === 0
    ? { action }
    : { action, content };

  return { ok: true, data: out };
}

function hasDeliveryDateCue(value: string): boolean {
  const normalized = normalizeForMatch(value);
  return (
    /\b(hoy|manana|pasado\s+manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|proximo|siguiente|este)\b/.test(
      normalized
    ) ||
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/.test(normalized) ||
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/.test(normalized)
  );
}

function hasDeliveryTimeCue(value: string): boolean {
  const normalized = normalizeForMatch(value);
  return /(?:^|[^0-9])\d{1,2}\s*:\s*\d{2}\b/.test(normalized) || /(?:^|[^0-9])\d{1,2}\s*(am|pm)\b/.test(normalized);
}

function isTimeOnlyDeliveryAnswer(value: string): boolean {
  return hasDeliveryTimeCue(value) && !hasDeliveryDateCue(value);
}

function normalizeOrderPayloadDelivery(args: {
  payload: Record<string, unknown>;
  timezone: string;
  now: Date;
}): { payload: Record<string, unknown>; deliveryError?: "time_missing" | "invalid" } {
  const raw = trimString(args.payload.fecha_hora_entrega);
  if (!raw) return { payload: { ...args.payload } };

  const canonical = normalizeDeliveryDateTime({
    value: raw,
    timezone: args.timezone,
    now: args.now,
    requireTime: true
  });
  if (canonical) {
    return {
      payload: {
        ...args.payload,
        fecha_hora_entrega: canonical
      }
    };
  }

  return {
    payload: { ...args.payload },
    deliveryError: hasDeliveryDateCue(raw) && !hasDeliveryTimeCue(raw) ? "time_missing" : "invalid"
  };
}

function normalizeOrderUpdatePatchDelivery(args: {
  patch: Record<string, unknown>;
  timezone: string;
  now: Date;
}): { patch: Record<string, unknown>; deliveryError?: "time_missing" | "invalid" } {
  const raw = trimString(args.patch.fecha_hora_entrega);
  if (!raw) return { patch: { ...args.patch } };

  const canonical = normalizeDeliveryDateTime({
    value: raw,
    timezone: args.timezone,
    now: args.now,
    requireTime: true
  });
  if (canonical) {
    return {
      patch: {
        ...args.patch,
        fecha_hora_entrega: canonical
      }
    };
  }

  return {
    patch: { ...args.patch },
    deliveryError: hasDeliveryDateCue(raw) && !hasDeliveryTimeCue(raw) ? "time_missing" : "invalid"
  };
}

function deliveryDateTimePrompt(reason: "time_missing" | "invalid"): string {
  if (reason === "time_missing") {
    return "Necesito también la hora de entrega. Ejemplos: mañana 5pm o 2026-03-20 17:00.";
  }
  return "No pude interpretar la fecha/hora de entrega. Usa formato como: 2026-03-20 17:00 o mañana 5pm.";
}

function mergeField(payload: Record<string, unknown>, field: string, userText: string): Record<string, unknown> {
  const t = userText.trim();
  if (field === "fecha_hora_entrega") {
    const existing = trimString(payload.fecha_hora_entrega);
    if (existing && isTimeOnlyDeliveryAnswer(t)) {
      return { ...payload, [field]: `${existing} ${t}`.trim() };
    }
    return { ...payload, [field]: t };
  }
  if (field === "monto" || field === "cantidad" || field === "total") {
    const match = t.match(/[-+]?\d+(?:[.,]\d+)?/);
    const parsed = match ? Number(match[0].replace(",", ".")) : Number.NaN;
    return Number.isFinite(parsed) ? { ...payload, [field]: parsed } : { ...payload, [field]: t };
  }
  if (field === "tipo_envio") return { ...payload, [field]: normalizeTipoEnvioInput(t) };
  if (field === "content.catalogItemsJson") {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return payload;
      return setNestedValue(payload, "content.catalogItems", parsed);
    } catch {
      return payload;
    }
  }
  if (field === "content.menuItemsJson") {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return payload;
      return setNestedValue(payload, "content.menuItems", parsed);
    } catch {
      return payload;
    }
  }
  if (field.includes(".")) {
    return setNestedValue(payload, field, t);
  }
  return { ...payload, [field]: t };
}

export function createConversationProcessor(deps: ProcessorDeps) {
  const strict_mode = process.env.OPENCLAW_STRICT === "1";
  const openclawReadOnlyRoutingEnabled = process.env.OPENCLAW_READONLY_ROUTING_ENABLE === "1";
  const openclawReadOnlyQuoteEnabled = (process.env.OPENCLAW_READONLY_QUOTE_ENABLE ?? "1") === "1";
  const codeReviewGraphEnabled = (process.env.CODE_REVIEW_GRAPH_ENABLE ?? "0") === "1";
  const nowMs = deps.nowMs ?? (() => Date.now());
  const newOperationId = deps.newOperationId ?? uuidv4;
  const routeIntentDetailedFn = deps.routeIntentDetailedFn ?? routeIntentDetailed;
  const routeReadOnlyIntentFn = deps.routeReadOnlyIntentFn ?? routeReadOnlyIntentDetailed;
  const routeIntentFn = deps.routeIntentFn;
  const parseExpenseFn = deps.parseExpenseFn ?? parseExpense;
  const parseOrderFn = deps.parseOrderFn ?? parseOrder;
  const parseWebFn = deps.parseWebFn ?? parseWebRequest;
  const executeExpenseFn = deps.executeExpenseFn ?? appendExpenseTool;
  const executeCreateCardFn = deps.executeCreateCardFn ?? createCardTool;
  const executeAppendOrderFn = deps.executeAppendOrderFn ?? appendOrderTool;
  const executeWebPublishFn = deps.executeWebPublishFn ?? createPublishSiteTool();
  const executeOrderReportFn = deps.executeOrderReportFn ?? createReportOrdersTool();
  const executeOrderLookupFn = deps.executeOrderLookupFn ?? createLookupOrderTool();
  const executeOrderStatusFn = deps.executeOrderStatusFn ?? createOrderStatusTool();
  const executeAdminHealthFn = deps.executeAdminHealthFn ?? createAdminHealthTool();
  const executeAdminConfigViewFn = deps.executeAdminConfigViewFn ?? createAdminConfigViewTool();
  const executeCodeReviewGraphFn = deps.executeCodeReviewGraphFn ?? createCodeReviewGraphTool();
  const executeShoppingListFn = deps.executeShoppingListFn ?? createShoppingListGenerateTool();
  const executeScheduleDayViewFn = deps.executeScheduleDayViewFn ?? createScheduleDayViewTool();
  const executeQuoteOrderFn = deps.executeQuoteOrderFn ?? createQuoteOrderTool();
  const executeOrderUpdateFn = deps.executeOrderUpdateFn ?? createUpdateOrderTool();
  const executeOrderCancelFn = deps.executeOrderCancelFn ?? createCancelOrderTool();
  const executePaymentRecordFn = deps.executePaymentRecordFn ?? createRecordPaymentTool();
  const executeInventoryConsumeFn = deps.executeInventoryConsumeFn ?? createInventoryConsumeTool();
  const orderCardSync = deps.orderCardSync ?? createOrderCardSyncTool();
  const orderReportTimezone = deps.orderReportTimezone?.trim() || REPORT_DEFAULT_TIMEZONE;
  const copy = createBotCopy(deps.botPersona);
  const webChatEnabled = deps.webChatEnabled ?? true;
  const inventoryConsumeEnabled = deps.inventoryConsumeEnabled ?? false;
  const rateLimiter = deps.rateLimiter;

  async function tryResolveOrderUpdateReferenceByLookup(args: {
    chat_id: string;
    text: string;
  }): Promise<
    | { kind: "resolved"; reference: OrderUpdateReference; query: string }
    | { kind: "ambiguous"; query: string; total: number; orders: OrderLookupResult["orders"] }
    | { kind: "not_found"; query: string }
    | { kind: "skip" | "error" }
  > {
    const query = extractOrderUpdateLookupQuery(args.text);
    if (!query || query.length < 2) return { kind: "skip" };

    try {
      const lookup = await executeOrderLookupFn({
        chat_id: args.chat_id,
        query
      });

      if (lookup.total === 0) {
        return { kind: "not_found", query };
      }
      if (lookup.total > 1) {
        return { kind: "ambiguous", query, total: lookup.total, orders: lookup.orders };
      }

      const resolved = lookup.orders[0];
      const folio = trimString(resolved?.folio);
      const operationId = trimString(resolved?.operation_id);
      if (!folio && !operationId) {
        return { kind: "not_found", query };
      }

      return {
        kind: "resolved",
        query,
        reference: {
          ...(folio ? { folio } : {}),
          ...(operationId ? { operation_id_ref: operationId } : {})
        }
      };
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : String(err);
      deps.onTrace?.({
        event: "order_update_lookup_failed",
        chat_id: args.chat_id,
        strict_mode,
        intent: "order.update",
        intent_source: "fallback",
        detail: safeDetail
      });
      return { kind: "error" };
    }
  }

  async function tryResolvePaymentRecordReferenceByLookup(args: {
    chat_id: string;
    text: string;
  }): Promise<
    | { kind: "resolved"; reference: PaymentRecordReference; query: string }
    | { kind: "ambiguous"; query: string; total: number; orders: OrderLookupResult["orders"] }
    | { kind: "not_found"; query: string }
    | { kind: "skip" | "error" }
  > {
    const query = extractPaymentRecordLookupQuery(args.text);
    if (!query || query.length < 2) return { kind: "skip" };

    try {
      const lookup = await executeOrderLookupFn({
        chat_id: args.chat_id,
        query
      });

      if (lookup.total === 0) {
        return { kind: "not_found", query };
      }
      if (lookup.total > 1) {
        return { kind: "ambiguous", query, total: lookup.total, orders: lookup.orders };
      }

      const resolved = lookup.orders[0];
      const folio = trimString(resolved?.folio);
      const operationId = trimString(resolved?.operation_id);
      if (!folio && !operationId) {
        return { kind: "not_found", query };
      }

      return {
        kind: "resolved",
        query,
        reference: {
          ...(folio ? { folio } : {}),
          ...(operationId ? { operation_id_ref: operationId } : {})
        }
      };
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : String(err);
      deps.onTrace?.({
        event: "payment_record_lookup_failed",
        chat_id: args.chat_id,
        strict_mode,
        intent: "payment.record",
        intent_source: "fallback",
        detail: safeDetail
      });
      return { kind: "error" };
    }
  }

  async function tryResolveOrderCancelReferenceByLookup(args: {
    chat_id: string;
    text: string;
  }): Promise<
    | { kind: "resolved"; reference: OrderCancelReference; query: string }
    | { kind: "ambiguous"; query: string; total: number }
    | { kind: "not_found"; query: string }
    | { kind: "skip" | "error" }
  > {
    const query = extractOrderCancelLookupQuery(args.text);
    if (!query || query.length < 2) return { kind: "skip" };

    try {
      const lookup = await executeOrderLookupFn({
        chat_id: args.chat_id,
        query
      });

      if (lookup.total === 0) {
        return { kind: "not_found", query };
      }
      if (lookup.total > 1) {
        return { kind: "ambiguous", query, total: lookup.total };
      }

      const resolved = lookup.orders[0];
      const folio = trimString(resolved?.folio);
      const operationId = trimString(resolved?.operation_id);
      if (!folio && !operationId) {
        return { kind: "not_found", query };
      }

      return {
        kind: "resolved",
        query,
        reference: {
          ...(folio ? { folio } : {}),
          ...(operationId ? { operation_id_ref: operationId } : {})
        }
      };
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : String(err);
      deps.onTrace?.({
        event: "order_cancel_lookup_failed",
        chat_id: args.chat_id,
        strict_mode,
        intent: "order.cancel",
        intent_source: "fallback",
        detail: safeDetail
      });
      return { kind: "error" };
    }
  }

  function startPendingOrderFlow(args: {
    chat_id: string;
    operation_id: string;
    payload: Record<string, unknown>;
  }): string[] {
    const normalizedOrder = normalizeOrderPayloadDelivery({
      payload: args.payload,
      timezone: orderReportTimezone,
      now: new Date(nowMs())
    });
    const v = validateWith(OrderSchema, normalizedOrder.payload);
    const pending = {
      operation_id: args.operation_id,
      action: { intent: "pedido" as const, payload: normalizedOrder.payload },
      missing: v.ok ? [] : v.missing,
      asked: v.ok ? undefined : pickOneMissing(v.missing)
    };

    setState(args.chat_id, { pending });

    if (!v.ok) {
      if (pending.asked === "fecha_hora_entrega" && normalizedOrder.deliveryError) {
        return [deliveryDateTimePrompt(normalizedOrder.deliveryError)];
      }
      return [copy.askFor(pending.asked ?? "unknown")];
    }

    const dedupe = registerPendingWithDedupe({
      operation_id: args.operation_id,
      chat_id: args.chat_id,
      intent: "pedido",
      payload: v.data,
      timestampMs: nowMs()
    });

    if (!dedupe.ok) {
      clearPending(args.chat_id);
      return [`Este pedido ya existe con folio ${dedupe.duplicate_of.operation_id}`];
    }

    const full = v.data;
    setState(args.chat_id, {
      pending: {
        ...pending,
        idempotency_key: dedupe.idempotency_key,
        action: { intent: "pedido", payload: full },
        missing: [],
        asked: undefined
      }
    });

    return [copy.summary("pedido", full, args.operation_id)];
  }

  async function handleMessage(msg: { chat_id: string; text: string }): Promise<string[]> {
    if (!deps.allowedChatIds.has(msg.chat_id)) {
      deps.onTrace?.({
        event: "allowlist_reject",
        chat_id: msg.chat_id,
        strict_mode,
        detail: "chat_id_not_allowed"
      });
      return [copy.unauthorized()];
    }

    const rateLimit = rateLimiter?.check(msg.chat_id);
    if (rateLimit && !rateLimit.ok) {
      deps.onTrace?.({
        event: "rate_limit_reject",
        chat_id: msg.chat_id,
        strict_mode,
        detail: `${rateLimit.reason};retry_after=${rateLimit.retryAfterSeconds}s`
      });
      return [copy.rateLimited(rateLimit.retryAfterSeconds)];
    }

    const st = getState(msg.chat_id);

    if (st.pending) {
      if (st.pending.action.intent === "quote.order") {
        if (isCancel(msg.text)) {
          clearPending(msg.chat_id);
          return ["Cotización cancelada."];
        }

        const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
        let query = trimString(payload.query) ?? "";
        const asked = st.pending.asked;
        const payloadSuggestions = parseQuoteOptionSuggestions(payload.quote_option_suggestions);
        const quoteId = trimString(payload.quote_id) ?? `quote-${st.pending.operation_id}`;
        payload.quote_id = quoteId;

        if (asked === QUOTE_TO_ORDER_CONFIRM_FIELD || asked === QUOTE_TO_ORDER_RECONFIRM_FIELD) {
          if (!isConfirm(msg.text)) {
            return [quoteToOrderConfirmPrompt()];
          }

          if (!query) {
            clearPending(msg.chat_id);
            return ["No pude recuperar la cotización para crear el pedido. Pídeme una nueva cotización."];
          }

          const previousSnapshot = parseStoredQuoteSnapshot(payload.quote_snapshot);
          let quote: QuoteOrderResult;
          try {
            quote = await executeQuoteOrderFn({
              chat_id: msg.chat_id,
              query
            });
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            deps.onTrace?.({
              event: "quote_order_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "quote.order",
              intent_source: "fallback",
              detail: safeDetail
            });

            if (safeDetail === "quote_order_product_not_found") {
              st.pending.asked = "quote_product";
              st.pending.missing = ["quote.product"];
              setState(msg.chat_id, st);
              return ["No pude identificar el producto base. ¿Qué producto quieres cotizar? Ejemplo: pastel mediano o caja de 12 cupcakes."];
            }

            if (safeDetail === "quote_order_shipping_zone_missing" || safeDetail === "quote_order_shipping_zone_ambiguous") {
              st.pending.asked = QUOTE_SHIPPING_ZONE_FIELD;
              st.pending.missing = ["quote.shipping_zone"];
              setState(msg.chat_id, st);
              return [quoteShippingZonePrompt()];
            }

            if (safeDetail === "quote_order_modifier_ambiguous") {
              st.pending.asked = QUOTE_MODIFIER_FIELD;
              st.pending.missing = ["quote.modifier"];
              setState(msg.chat_id, st);
              return [quoteModifierClarificationPrompt()];
            }

            clearPending(msg.chat_id);
            return ["No pude generar la cotización en este momento. Intenta de nuevo en unos minutos."];
          }

          const customizationField = nextQuoteCustomizationField(query);
          if (customizationField) {
            const nextSuggestions = quote.optionSuggestions ?? payloadSuggestions;
            if (nextSuggestions) {
              payload.quote_option_suggestions = nextSuggestions;
            }
            payload.query = query;
            payload.quote_id = quoteId;
            st.pending.action.payload = payload;
            st.pending.asked = customizationField;
            st.pending.missing = [customizationField];
            setState(msg.chat_id, st);
            return [quotePromptForField(customizationField, nextSuggestions?.[customizationField])];
          }

          const currentSnapshot = buildStoredQuoteSnapshot(quote);
          const orderPayload = buildOrderPayloadFromQuote({ query, quote, quoteId });
          payload.query = query;
          payload.quote_id = quoteId;
          payload.quote_snapshot = currentSnapshot;
          payload.quote_order_payload = orderPayload;
          st.pending.action.payload = payload;

          if (previousSnapshot && hasQuoteSnapshotChanges(previousSnapshot, currentSnapshot)) {
            st.pending.asked = QUOTE_TO_ORDER_RECONFIRM_FIELD;
            st.pending.missing = [QUOTE_TO_ORDER_RECONFIRM_FIELD];
            setState(msg.chat_id, st);
            return [
              formatQuoteReconfirmationPrompt({
                previous: previousSnapshot,
                current: quote
              })
            ];
          }

          deps.onTrace?.({
            event: "quote_to_order_confirmed",
            chat_id: msg.chat_id,
            strict_mode,
            intent: "pedido",
            intent_source: "fallback",
            detail: "quote_to_order_confirmed"
          });

          return startPendingOrderFlow({
            chat_id: msg.chat_id,
            operation_id: newOperationId(),
            payload: orderPayload
          });
        }

        if (asked === "quote_product") {
          const productText = msg.text.trim();
          if (productText.length < 3) {
            return ["¿Qué producto base quieres cotizar? Ejemplo: pastel mediano o caja de 12 cupcakes."];
          }
          query = appendQuoteHint(query, productText);
          payload.query = query;
          st.pending.action.payload = payload;
        } else if (asked === "quote_quantity") {
          const qty = parseQuoteQuantityFromText(msg.text);
          if (!qty) {
            return ["¿Para cuántas piezas/porciones lo cotizo?"];
          }
          query = appendQuoteHint(query, `x${qty}`);
          payload.query = query;
          st.pending.action.payload = payload;
        } else if (asked === "quote_shipping") {
          const shipping = parseQuoteShippingFromText(msg.text);
          if (!shipping) {
            return ["¿La entrega será para recoger en tienda o envío a domicilio?"];
          }
          query = appendQuoteHint(query, shipping === "recoger_en_tienda" ? "recoger en tienda" : "envio a domicilio");
          payload.query = query;
          st.pending.action.payload = payload;
        } else if (asked === QUOTE_SHIPPING_ZONE_FIELD) {
          const zoneText = msg.text.trim();
          if (zoneText.length < 2) {
            return [quoteShippingZonePrompt()];
          }
          query = appendQuoteHint(query, zoneText);
          payload.query = query;
          st.pending.action.payload = payload;
        } else if (asked === QUOTE_MODIFIER_FIELD) {
          const modifierText = parseQuoteCustomizationAnswer(msg.text);
          if (!modifierText) {
            return [quoteModifierClarificationPrompt()];
          }
          const hint = isQuoteSkipAnswer(modifierText) ? "sin extras" : modifierText;
          query = appendQuoteHint(query, hint);
          payload.query = query;
          st.pending.action.payload = payload;
        } else if (
          asked === "quote_sabor_pan" ||
          asked === "quote_sabor_relleno" ||
          asked === "quote_tipo_betun" ||
          asked === "quote_topping"
        ) {
          const answer = parseQuoteCustomizationAnswer(msg.text);
          if (!answer) {
            return [quotePromptForField(asked, payloadSuggestions?.[asked])];
          }
          const label = quoteHintLabelForField(asked);
          const hint = isQuoteSkipAnswer(answer) ? `sin ${label}` : `${label} ${answer}`;
          query = appendQuoteHint(query, hint);
          payload.query = query;
          st.pending.action.payload = payload;
        }

        const qty = parseQuoteQuantityFromText(query);
        if (!qty) {
          st.pending.asked = "quote_quantity";
          st.pending.missing = ["quote.quantity"];
          setState(msg.chat_id, st);
          return ["¿Para cuántas piezas/porciones lo cotizo?"];
        }

        const shipping = parseQuoteShippingFromText(query);
        if (!shipping) {
          st.pending.asked = "quote_shipping";
          st.pending.missing = ["quote.shipping"];
          setState(msg.chat_id, st);
          return ["¿La entrega será para recoger en tienda o envío a domicilio?"];
        }

        let quote: QuoteOrderResult;
        try {
          quote = await executeQuoteOrderFn({
            chat_id: msg.chat_id,
            query
          });
        } catch (err) {
          const safeDetail = err instanceof Error ? err.message : String(err);

          deps.onTrace?.({
            event: "quote_order_failed",
            chat_id: msg.chat_id,
            strict_mode,
            intent: "quote.order",
            intent_source: "fallback",
            detail: safeDetail
          });

          if (safeDetail === "quote_order_product_not_found") {
            st.pending.asked = "quote_product";
            st.pending.missing = ["quote.product"];
            setState(msg.chat_id, st);
            return ["No pude identificar el producto base. ¿Qué producto quieres cotizar? Ejemplo: pastel mediano o caja de 12 cupcakes."];
          }

          if (safeDetail === "quote_order_shipping_zone_missing" || safeDetail === "quote_order_shipping_zone_ambiguous") {
            st.pending.asked = QUOTE_SHIPPING_ZONE_FIELD;
            st.pending.missing = ["quote.shipping_zone"];
            setState(msg.chat_id, st);
            return [quoteShippingZonePrompt()];
          }

          if (safeDetail === "quote_order_modifier_ambiguous") {
            st.pending.asked = QUOTE_MODIFIER_FIELD;
            st.pending.missing = ["quote.modifier"];
            setState(msg.chat_id, st);
            return [quoteModifierClarificationPrompt()];
          }

          clearPending(msg.chat_id);
          return ["No pude generar la cotización en este momento. Intenta de nuevo en unos minutos."];
        }

        const customizationField = nextQuoteCustomizationField(query);
        if (customizationField) {
          const nextSuggestions = quote.optionSuggestions ?? payloadSuggestions;
          if (nextSuggestions) {
            payload.quote_option_suggestions = nextSuggestions;
            st.pending.action.payload = payload;
          }
          st.pending.asked = customizationField;
          st.pending.missing = [customizationField];
          setState(msg.chat_id, st);
          return [quotePromptForField(customizationField, nextSuggestions?.[customizationField])];
        }

        deps.onTrace?.({
          event: "quote_order_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "quote.order",
          intent_source: "fallback",
          detail: `product=${quote.product.key};total=${quote.total}`
        });

        const orderPayload = buildOrderPayloadFromQuote({ query, quote, quoteId });
        const quoteSnapshot = buildStoredQuoteSnapshot(quote);
        payload.query = query;
        payload.quote_id = quoteId;
        payload.quote_snapshot = quoteSnapshot;
        payload.quote_order_payload = orderPayload;
        st.pending.action.payload = payload;
        st.pending.asked = QUOTE_TO_ORDER_CONFIRM_FIELD;
        st.pending.missing = [QUOTE_TO_ORDER_CONFIRM_FIELD];
        setState(msg.chat_id, st);
        return [formatQuoteReplyWithOrderCta(quote)];
      }

      if (st.pending.asked && isConfirm(msg.text)) {
        return [copy.askFor(st.pending.asked)];
      }

      if (isConfirm(msg.text)) {
        const idempotencyKey = st.pending.idempotency_key ?? st.pending.operation_id;

        upsertOperation({
          operation_id: st.pending.operation_id,
          chat_id: msg.chat_id,
          intent: st.pending.action.intent,
          payload: st.pending.action.payload,
          status: "confirmed",
          idempotency_key: idempotencyKey
        });

        if (st.pending.action.intent === "gasto") {
          const vExpense = validateWith(ExpenseSchema, st.pending.action.payload);
          if (!vExpense.ok) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "expense_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "gasto",
              detail: "payload_validation_failed"
            });

            return [
              copy.expenseFailed(st.pending.operation_id)
            ];
          }

          try {
            const execution = await executeExpenseFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              payload: vExpense.data
            });

            if (!execution.ok) {
              throw new Error(execution.detail || "expense_execution_failed");
            }

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "expense_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "gasto",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "expense_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "gasto",
              detail: safeDetail
            });

            return [
              copy.expenseFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "pedido") {
          const vOrder = validateWith(OrderSchema, st.pending.action.payload);
          if (!vOrder.ok) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "pedido",
              detail: "payload_validation_failed"
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }

          try {
            const cardExecution = await executeCreateCardFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              payload: vOrder.data
            });
            if (!cardExecution.ok) {
              throw new Error(cardExecution.detail || "order_create_card_failed");
            }

            let appendExecution;
            try {
              appendExecution = await executeAppendOrderFn({
                operation_id: st.pending.operation_id,
                chat_id: msg.chat_id,
                payload: vOrder.data,
                trello_card_id: cardExecution.payload?.trello_card_id,
                estado_pedido: "activo"
              });
              if (!appendExecution.ok) {
                throw new Error(appendExecution.detail || "order_append_failed");
              }
            } catch (err) {
              const cardId = cardExecution.payload?.trello_card_id;
              const cardCreated = cardExecution.payload?.trello_card_created === true;
              if (cardCreated && cardId) {
                try {
                  await orderCardSync.deleteCard({
                    operation_id: st.pending.operation_id,
                    card_id: cardId,
                    dryRun: cardExecution.dry_run
                  });
                } catch {
                  throw new Error("order_create_rollback_delete_card_failed");
                }
              }
              throw err;
            }

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "pedido",
              detail: `${cardExecution.detail};${appendExecution.detail}`
            });

            clearPending(msg.chat_id);
            const isDryRun = cardExecution.dry_run && appendExecution.dry_run;
            return [copy.executed(st.pending.operation_id, isDryRun)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "pedido",
              detail: safeDetail
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "order.update") {
          const payload = st.pending.action.payload;
          if (!isObjectRecord(payload) || !isObjectRecord(payload.reference) || !isObjectRecord(payload.patch)) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_update_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.update",
              detail: "payload_validation_failed"
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }

          try {
            const reference = payload.reference as OrderUpdateReference;
            const patch = payload.patch as Record<string, unknown>;

            const cardSync = await orderCardSync.updateCardForOrder({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              trello_card_id: typeof payload.trello_card_id === "string" ? payload.trello_card_id : undefined,
              reference: {
                folio: reference.folio,
                operation_id_ref: reference.operation_id_ref
              },
              patch
            });

            let execution;
            try {
              execution = await executeOrderUpdateFn({
                operation_id: st.pending.operation_id,
                chat_id: msg.chat_id,
                reference,
                patch,
                trello_card_id: cardSync.card_id
              });
              if (!execution.ok) {
                throw new Error(execution.detail || "order_update_failed");
              }
            } catch (err) {
              try {
                await orderCardSync.rollbackCard({
                  operation_id: st.pending.operation_id,
                  snapshot: cardSync.snapshot,
                  dryRun: cardSync.dry_run
                });
              } catch (rollbackErr) {
                const rollbackDetail = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
                throw new Error(`order_update_rollback_failed:${rollbackDetail}`);
              }
              throw err;
            }

            st.pending.action.payload = execution.payload as unknown as Record<string, unknown>;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_update_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.update",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_update_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.update",
              detail: safeDetail
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "order.cancel") {
          const payload = st.pending.action.payload;
          if (!isObjectRecord(payload) || !isObjectRecord(payload.reference)) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_cancel_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.cancel",
              detail: "payload_validation_failed"
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }

          try {
            const reference = payload.reference as OrderCancelReference;
            const trelloCardId = typeof payload.trello_card_id === "string" ? payload.trello_card_id : undefined;
            const cardSync = await orderCardSync.cancelCardForOrder({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              trello_card_id: trelloCardId,
              reference: {
                folio: reference.folio,
                operation_id_ref: reference.operation_id_ref
              },
              motivo: typeof payload.motivo === "string" ? payload.motivo : undefined
            });

            let execution;
            try {
              execution = await executeOrderCancelFn({
                operation_id: st.pending.operation_id,
                chat_id: msg.chat_id,
                reference,
                motivo: typeof payload.motivo === "string" ? payload.motivo : undefined,
                trello_card_id: cardSync.card_id
              });
              if (!execution.ok) {
                throw new Error(execution.detail || "order_cancel_failed");
              }
            } catch (err) {
              try {
                await orderCardSync.rollbackCard({
                  operation_id: st.pending.operation_id,
                  snapshot: cardSync.snapshot,
                  dryRun: cardSync.dry_run
                });
              } catch (rollbackErr) {
                const rollbackDetail = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
                throw new Error(`order_cancel_rollback_failed:${rollbackDetail}`);
              }
              throw err;
            }

            st.pending.action.payload = execution.payload as unknown as Record<string, unknown>;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_cancel_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.cancel",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            const warning = buildOrderCancelTimingWarning({
              fecha_hora_entrega: execution.payload.after?.fecha_hora_entrega,
              fecha_hora_entrega_iso: execution.payload.after?.fecha_hora_entrega_iso,
              nowMs: nowMs()
            });

            if (execution.payload.already_canceled) {
              const folio = execution.payload.after?.folio || execution.payload.reference.folio || execution.payload.reference.operation_id_ref;
              const base = folio
                ? `Este pedido ya fue cancelado con folio ${folio}`
                : "Este pedido ya fue cancelado.";
              return [warning ? `${base}\n${warning}` : base];
            }

            const success = copy.executed(st.pending.operation_id, execution.dry_run);
            return [warning ? `${success}\n${warning}` : success];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);
            const traceRef = `order-cancel:${st.pending.operation_id}`;

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_cancel_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.cancel",
              detail: `${safeDetail};ref=${traceRef}`
            });

            return [`No se pudo ejecutar el pedido. Ref: ${traceRef}`];
          }
        }

        if (st.pending.action.intent === "payment.record") {
          const payload = st.pending.action.payload;
          if (!isObjectRecord(payload) || !isObjectRecord(payload.reference) || !isObjectRecord(payload.payment)) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "payment_record_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "payment.record",
              detail: "payload_validation_failed"
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }

          try {
            const execution = await executePaymentRecordFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              reference: payload.reference as PaymentRecordReference,
              payment: payload.payment as PaymentRecordInput
            });
            if (!execution.ok) {
              throw new Error(execution.detail || "payment_record_failed");
            }

            st.pending.action.payload = execution.payload as unknown as Record<string, unknown>;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "payment_record_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "payment.record",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            if (execution.payload.already_recorded) {
              const ref = execution.payload.reference.folio || execution.payload.reference.operation_id_ref || "pedido";
              return [`Pago ya registrado para ${ref}. operation_id: ${st.pending.operation_id}`];
            }
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "payment_record_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "payment.record",
              detail: safeDetail
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "inventory.consume") {
          const payload = st.pending.action.payload;
          if (!isObjectRecord(payload) || !isObjectRecord(payload.reference)) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "inventory_consume_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "inventory.consume",
              detail: "payload_validation_failed"
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }

          if (!inventoryConsumeEnabled) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });
            clearPending(msg.chat_id);
            return [copy.inventoryConsumeDisabled()];
          }

          try {
            const execution = await executeInventoryConsumeFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              reference: payload.reference as InventoryConsumeReference
            });
            if (!execution.ok) {
              throw new Error(execution.detail || "inventory_consume_failed");
            }

            st.pending.action.payload = execution.payload as unknown as Record<string, unknown>;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "inventory_consume_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "inventory.consume",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            if (execution.payload.idempotent_replay) {
              return [execution.detail || copy.inventoryConsumeReplay(inventoryOrderRefLabelSkill(payload), execution.operation_id)];
            }
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "inventory_consume_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "inventory.consume",
              detail: safeDetail
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "web") {
          const vWeb = validateWebPayloadDraft(st.pending.action.payload as Record<string, unknown>);
          if (!vWeb.ok) {
            st.pending.missing = vWeb.missing;
            const next = pickOneMissing(vWeb.missing, st.pending.asked);
            st.pending.asked = next ?? undefined;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "pending_confirm",
              idempotency_key: idempotencyKey
            });
            setState(msg.chat_id, st);
            return [copy.askFor(st.pending.asked ?? "unknown")];
          }

          try {
            const execution = await executeWebPublishFn({
              operation_id: st.pending.operation_id,
              payload: vWeb.data
            });
            if (!execution.ok) {
              throw new Error(execution.detail || "web_publish_failed");
            }

            st.pending.action.payload = vWeb.data as unknown as Record<string, unknown>;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "web_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "web",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "web_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "web",
              detail: safeDetail
            });

            return [
              copy.webFailed(st.pending.operation_id)
            ];
          }
        }

        const fallbackAction = st.pending.action as { intent: string; payload: Record<string, unknown> };
        upsertOperation({
          operation_id: st.pending.operation_id,
          chat_id: msg.chat_id,
          intent: fallbackAction.intent,
          payload: fallbackAction.payload,
          status: "executed",
          idempotency_key: idempotencyKey
        });

        clearPending(msg.chat_id);
        return [copy.executedSimulated(st.pending.operation_id)];
      }

      if (isCancel(msg.text)) {
        upsertOperation({
          operation_id: st.pending.operation_id,
          chat_id: msg.chat_id,
          intent: st.pending.action.intent,
          payload: st.pending.action.payload,
          status: "canceled",
          idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
        });

        clearPending(msg.chat_id);
        return [copy.canceled(st.pending.operation_id)];
      }

      if (st.pending.asked) {
        if (st.pending.action.intent === "reporte") {
          const reportPeriod = detectOrderReportPeriodFromClarification({
            text: msg.text,
            now: new Date(nowMs()),
            timezone: orderReportTimezone
          });
          if (!reportPeriod) {
            return [copy.askFor("order_report_period")];
          }

          try {
            const report = await executeOrderReportFn({
              chat_id: msg.chat_id,
              period: reportPeriod
            });

            deps.onTrace?.({
              event: "order_report_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "reporte",
              intent_source: "fallback",
              detail: `period=${report.period.type}:${report.period.label};total=${report.total};trace_ref=${report.trace_ref};inconsistencies=${report.inconsistencies.length}`
            });

            clearPending(msg.chat_id);
            return [formatOrderReportReply(report)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);
            const traceRef = `report-orders:${newOperationId()}`;

            deps.onTrace?.({
              event: "order_report_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "reporte",
              intent_source: "fallback",
              detail: `${safeDetail};ref=${traceRef}`
            });

            clearPending(msg.chat_id);
            return [`No pude consultar pedidos en este momento. Ref: ${traceRef}`];
          }
        }

        if (st.pending.action.intent === "shopping.list.generate") {
          const query = msg.text.trim();
          if (query.length < 2) {
            return [copy.askFor("shopping_list_query")];
          }

          try {
            const shoppingList = await executeShoppingListFn({
              chat_id: msg.chat_id,
              scope: {
                type: "lookup",
                query,
                label: `"${normalizeForMatch(query)}"`
              }
            });

            deps.onTrace?.({
              event: "shopping_list_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "shopping.list.generate",
              intent_source: "fallback",
              detail: `scope=${shoppingList.scope.type}:${shoppingList.scope.label};orders=${shoppingList.totalOrders}`
            });

            clearPending(msg.chat_id);
            return [formatShoppingListReply(shoppingList)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            deps.onTrace?.({
              event: "shopping_list_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "shopping.list.generate",
              intent_source: "fallback",
              detail: safeDetail
            });

            clearPending(msg.chat_id);
            return ["No pude generar la lista de insumos en este momento. Intenta de nuevo en unos minutos."];
          }
        }

        if (st.pending.action.intent === "schedule.day_view") {
          const query = msg.text.trim();
          if (query.length < 2) {
            return [copy.askFor("schedule_day_query")];
          }

          const dayCandidate = parseOrderReportDayPeriod({
            normalized: normalizeForMatch(query),
            now: new Date(nowMs()),
            timezone: orderReportTimezone
          });
          const day = dayCandidate && dayCandidate.type === "day"
            ? {
              type: "day" as const,
              dateKey: dayCandidate.dateKey,
              label: dayCandidate.label
            }
            : undefined;
          if (!day) {
            return [copy.askFor("schedule_day_query")];
          }

          try {
            const dayView = await executeScheduleDayViewFn({
              chat_id: msg.chat_id,
              day
            });

            deps.onTrace?.({
              event: "schedule_day_view_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "schedule.day_view",
              intent_source: "fallback",
              detail: `${dayView.detail};trace_ref=${dayView.trace_ref};inconsistencies=${dayView.inconsistencies.length}`
            });

            clearPending(msg.chat_id);
            return [formatScheduleDayViewReply(dayView)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);
            const traceRef = `schedule-day-view:${newOperationId()}`;

            deps.onTrace?.({
              event: "schedule_day_view_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "schedule.day_view",
              intent_source: "fallback",
              detail: `${safeDetail};ref=${traceRef}`
            });

            clearPending(msg.chat_id);
            return [`No pude generar la agenda del día en este momento. Ref: ${traceRef}`];
          }
        }

        if (st.pending.action.intent === "order.lookup") {
          const query = msg.text.trim();
          if (query.length < 2) {
            return [copy.askFor("order_lookup_query")];
          }

          try {
            const lookup = await executeOrderLookupFn({
              chat_id: msg.chat_id,
              query
            });

            deps.onTrace?.({
              event: "order_lookup_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.lookup",
              intent_source: "fallback",
              detail: `query=${lookup.query};total=${lookup.total};trace_ref=${lookup.trace_ref}`
            });

            clearPending(msg.chat_id);
            return [formatOrderLookupReply(lookup)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);
            if (safeDetail.includes("order_lookup_query_invalid")) {
              return [copy.askFor("order_lookup_query")];
            }
            const traceRef = `order-lookup:${newOperationId()}`;

            deps.onTrace?.({
              event: "order_lookup_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.lookup",
              intent_source: "fallback",
              detail: `${safeDetail};ref=${traceRef}`
            });

            clearPending(msg.chat_id);
            return [`No pude consultar ese pedido en este momento. Ref: ${traceRef}`];
          }
        }

        if (st.pending.action.intent === "order.status") {
          const query = msg.text.trim();
          if (query.length < 2) {
            return [copy.askFor("order_status_query")];
          }

          try {
            const status = await executeOrderStatusFn({
              chat_id: msg.chat_id,
              query
            });

            deps.onTrace?.({
              event: "order_status_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.status",
              intent_source: "fallback",
              detail: `query=${status.query};total=${status.total};trace_ref=${status.trace_ref}`
            });

            clearPending(msg.chat_id);
            return [formatOrderStatusReply(status)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);
            if (safeDetail.includes("order_status_query_invalid")) {
              return [copy.askFor("order_status_query")];
            }
            const traceRef = `order-status:${newOperationId()}`;

            deps.onTrace?.({
              event: "order_status_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.status",
              intent_source: "fallback",
              detail: `${safeDetail};ref=${traceRef}`
            });

            clearPending(msg.chat_id);
            return [`No pude consultar el estado de ese pedido en este momento. Ref: ${traceRef}`];
          }
        }

        if (st.pending.action.intent === "order.update") {
          const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
          const reference = isObjectRecord(payload.reference) ? { ...payload.reference } : {};
          const patch = isObjectRecord(payload.patch) ? { ...payload.patch } : {};
          const mergedReference = {
            ...reference,
            ...referenceFromFreeTextSkill(msg.text)
          };

          let mergedPatch: Record<string, unknown> = patch;
          if (st.pending.asked === "order_update_patch") {
            const extracted = extractOrderUpdatePatchSkill(msg.text);
            if (extracted.jsonInvalid) {
              setState(msg.chat_id, st);
              return [copy.parseError("order_update_payload_json_invalid")];
            }
            if (isObjectRecord(extracted.patch)) {
              mergedPatch = {
                ...mergedPatch,
                ...extracted.patch
              };
            }
          }

          const normalizedPatch = normalizeOrderUpdatePatchDelivery({
            patch: mergedPatch,
            timezone: orderReportTimezone,
            now: new Date(nowMs())
          });
          mergedPatch = normalizedPatch.patch;

          st.pending.action.payload = {
            ...payload,
            reference: mergedReference,
            patch: mergedPatch
          };

          if (!hasOrderReferenceSkill(mergedReference)) {
            const resolved = await tryResolveOrderUpdateReferenceByLookup({
              chat_id: msg.chat_id,
              text: msg.text
            });
            if (resolved.kind === "resolved") {
              st.pending.action.payload = {
                ...payload,
                reference: resolved.reference,
                patch: mergedPatch
              };
            } else {
              st.pending.action.payload = {
                ...payload,
                reference: mergedReference,
                patch: mergedPatch
              };
            }

            if (resolved.kind === "ambiguous") {
              st.pending.asked = "order_reference";
              st.pending.missing = ["order_reference"];
              setState(msg.chat_id, st);
              return [formatOrderUpdateAmbiguousReply({
                query: resolved.query,
                total: resolved.total,
                orders: resolved.orders
              })];
            }

            if (resolved.kind === "not_found") {
              st.pending.asked = "order_reference";
              st.pending.missing = ["order_reference"];
              setState(msg.chat_id, st);
              return [
                `No encontré pedidos para "${resolved.query}". Compárteme el folio u operation_id para continuar con la actualización.`
              ];
            }

            if (!hasOrderReferenceSkill((st.pending.action.payload as Record<string, unknown>).reference)) {
              st.pending.asked = "order_reference";
              st.pending.missing = ["order_reference"];
              setState(msg.chat_id, st);
              return [copy.askFor("order_reference")];
            }
          } else {
            st.pending.action.payload = {
              ...payload,
              reference: mergedReference,
              patch: mergedPatch
            };
          }

          if (normalizedPatch.deliveryError) {
            st.pending.asked = "order_update_patch";
            st.pending.missing = ["order_update_patch"];
            setState(msg.chat_id, st);
            return [deliveryDateTimePrompt(normalizedPatch.deliveryError)];
          }

          if (!hasOrderUpdatePatch((st.pending.action.payload as Record<string, unknown>).patch)) {
            st.pending.asked = "order_update_patch";
            st.pending.missing = ["order_update_patch"];
            setState(msg.chat_id, st);
            return [copy.askFor("order_update_patch")];
          }

          st.pending.asked = undefined;
          st.pending.missing = [];
          setState(msg.chat_id, st);

          const register = registerPendingOperation({
            operation_id: st.pending.operation_id,
            chat_id: msg.chat_id,
            intent: "order.update",
            payload: st.pending.action.payload,
            idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
          });

          if (!register.inserted) {
            clearPending(msg.chat_id);
            return [
              copy.duplicate(register.operation.operation_id, register.operation.status)
            ];
          }

          return [copy.summary("order.update", st.pending.action.payload, st.pending.operation_id)];
        }

        if (st.pending.action.intent === "order.cancel") {
          const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
          const reference = isObjectRecord(payload.reference) ? { ...payload.reference } : {};
          const mergedReference = {
            ...reference,
            ...referenceFromFreeTextSkill(msg.text)
          };

          if (!hasOrderReferenceSkill(mergedReference)) {
            const resolved = await tryResolveOrderCancelReferenceByLookup({
              chat_id: msg.chat_id,
              text: msg.text
            });
            if (resolved.kind === "resolved") {
              st.pending.action.payload = {
                ...payload,
                reference: resolved.reference
              };
            } else {
              st.pending.action.payload = {
                ...payload,
                reference: mergedReference
              };
            }

            if (resolved.kind === "ambiguous") {
              setState(msg.chat_id, st);
              return [
                `Encontré ${resolved.total} pedidos para "${resolved.query}". Compárteme el folio u operation_id para cancelar el correcto.`
              ];
            }

            if (resolved.kind === "not_found") {
              setState(msg.chat_id, st);
              return [
                `No encontré pedidos para "${resolved.query}". Compárteme el folio u operation_id para continuar con la cancelación.`
              ];
            }

            if (!hasOrderReferenceSkill((st.pending.action.payload as Record<string, unknown>).reference)) {
              setState(msg.chat_id, st);
              return [copy.askFor("order_reference")];
            }
          } else {
            st.pending.action.payload = {
              ...payload,
              reference: mergedReference
            };
          }

          if (!hasOrderReferenceSkill((st.pending.action.payload as Record<string, unknown>).reference)) {
            setState(msg.chat_id, st);
            return [copy.askFor("order_reference")];
          }

          st.pending.asked = undefined;
          st.pending.missing = [];
          setState(msg.chat_id, st);

          const register = registerPendingOperation({
            operation_id: st.pending.operation_id,
            chat_id: msg.chat_id,
            intent: "order.cancel",
            payload: st.pending.action.payload,
            idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
          });

          if (!register.inserted) {
            clearPending(msg.chat_id);
            const pendingReference = isObjectRecord(st.pending.action.payload) && isObjectRecord(st.pending.action.payload.reference)
              ? st.pending.action.payload.reference
              : undefined;
            const folio = pendingReference && typeof pendingReference.folio === "string"
              ? pendingReference.folio
              : register.operation.operation_id;
            return [`Este pedido ya fue cancelado con folio ${folio}`];
          }

          return [copy.summary("order.cancel", st.pending.action.payload, st.pending.operation_id)];
        }

        if (st.pending.action.intent === "payment.record") {
          const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
          const reference = isObjectRecord(payload.reference) ? { ...payload.reference } : {};
          const payment = isObjectRecord(payload.payment) ? { ...payload.payment } : {};

          const mergedReference = {
            ...reference,
            ...referenceFromFreeTextSkill(msg.text)
          };

          const normalizedInput = normalizeForMatch(msg.text);
          const estadoFromInput = normalizedInput.match(/\b(pagado|pendiente|parcial)\b/)?.[1];
          if (estadoFromInput) {
            payment.estado_pago = estadoFromInput;
          }

          st.pending.action.payload = {
            ...payload,
            reference: mergedReference,
            payment
          };

          if (!hasOrderReferenceSkill(mergedReference)) {
            const resolved = await tryResolvePaymentRecordReferenceByLookup({
              chat_id: msg.chat_id,
              text: msg.text
            });
            if (resolved.kind === "resolved") {
              st.pending.action.payload = {
                ...payload,
                reference: resolved.reference,
                payment
              };
            } else {
              st.pending.action.payload = {
                ...payload,
                reference: mergedReference,
                payment
              };
            }

            if (resolved.kind === "ambiguous") {
              st.pending.asked = "order_reference";
              st.pending.missing = ["order_reference"];
              setState(msg.chat_id, st);
              return [formatPaymentRecordAmbiguousReply({
                query: resolved.query,
                total: resolved.total,
                orders: resolved.orders
              })];
            }

            if (resolved.kind === "not_found") {
              st.pending.asked = "order_reference";
              st.pending.missing = ["order_reference"];
              setState(msg.chat_id, st);
              return [
                `No encontré pedidos para "${resolved.query}". Compárteme el folio u operation_id para registrar el pago correcto.`
              ];
            }

            if (!hasOrderReferenceSkill((st.pending.action.payload as Record<string, unknown>).reference)) {
              st.pending.asked = "order_reference";
              st.pending.missing = ["order_reference"];
              setState(msg.chat_id, st);
              return [copy.askFor("order_reference")];
            }
          } else {
            st.pending.action.payload = {
              ...payload,
              reference: mergedReference,
              payment
            };
          }

          if (typeof payment.estado_pago !== "string" || payment.estado_pago.trim().length === 0) {
            st.pending.asked = "payment_estado_pago";
            st.pending.missing = ["payment.estado_pago"];
            setState(msg.chat_id, st);
            return [copy.askFor("payment_estado_pago")];
          }

          st.pending.asked = undefined;
          st.pending.missing = [];
          setState(msg.chat_id, st);

          const register = registerPendingOperation({
            operation_id: st.pending.operation_id,
            chat_id: msg.chat_id,
            intent: "payment.record",
            payload: st.pending.action.payload,
            idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
          });

          if (!register.inserted) {
            clearPending(msg.chat_id);
            return [
              copy.duplicate(register.operation.operation_id, register.operation.status)
            ];
          }

          return [copy.summary("payment.record", st.pending.action.payload, st.pending.operation_id)];
        }

        if (st.pending.action.intent === "inventory.consume") {
          if (!inventoryConsumeEnabled) {
            clearPending(msg.chat_id);
            return [copy.inventoryConsumeDisabled()];
          }

          const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
          const reference = isObjectRecord(payload.reference) ? { ...payload.reference } : {};
          const mergedReference = {
            ...reference,
            ...referenceFromFreeTextSkill(msg.text)
          };

          st.pending.action.payload = {
            ...payload,
            reference: mergedReference
          };

          if (!hasOrderReferenceSkill(mergedReference)) {
            st.pending.asked = "order_reference";
            st.pending.missing = ["order_reference"];
            setState(msg.chat_id, st);
            return [copy.askFor("order_reference")];
          }

          st.pending.asked = undefined;
          st.pending.missing = [];
          setState(msg.chat_id, st);

          const register = registerPendingOperation({
            operation_id: st.pending.operation_id,
            chat_id: msg.chat_id,
            intent: "inventory.consume",
            payload: st.pending.action.payload,
            idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
          });

          if (!register.inserted) {
            clearPending(msg.chat_id);
            return [
              copy.inventoryConsumeReplay(inventoryOrderRefLabelSkill(st.pending.action.payload), register.operation.operation_id)
            ];
          }

          return [copy.summary("inventory.consume", st.pending.action.payload, st.pending.operation_id)];
        }

        const updatedPayload = mergeField(st.pending.action.payload, st.pending.asked, msg.text);
        let payloadForValidation = updatedPayload;
        let orderDeliveryError: "time_missing" | "invalid" | undefined;

        if (st.pending.action.intent === "pedido") {
          const normalizedOrder = normalizeOrderPayloadDelivery({
            payload: updatedPayload,
            timezone: orderReportTimezone,
            now: new Date(nowMs())
          });
          payloadForValidation = normalizedOrder.payload;
          orderDeliveryError = normalizedOrder.deliveryError;
        }

        st.pending.action.payload = payloadForValidation;

        if (st.pending.action.intent === "web") {
          const vWeb = validateWebPayloadDraft(updatedPayload);
          if (vWeb.ok) {
            const register = registerPendingOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: "web",
              payload: vWeb.data,
              idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
            });

            if (!register.inserted) {
              clearPending(msg.chat_id);
              return [
                copy.duplicate(register.operation.operation_id, register.operation.status)
              ];
            }

            st.pending.action.payload = vWeb.data as unknown as Record<string, unknown>;
            st.pending.idempotency_key = st.pending.operation_id;
            st.pending.missing = [];
            st.pending.asked = undefined;
            setState(msg.chat_id, st);
            return [copy.summary(st.pending.action.intent, st.pending.action.payload, st.pending.operation_id)];
          }

          st.pending.missing = vWeb.missing;
          const next = pickOneMissing(vWeb.missing, st.pending.asked);
          st.pending.asked = next ?? undefined;
          setState(msg.chat_id, st);
          return [copy.askFor(st.pending.asked ?? "unknown")];
        }

        const schema = st.pending.action.intent === "gasto" ? ExpenseSchema : OrderSchema;
        const v = validateWith(schema, payloadForValidation);

        if (v.ok) {
          const intent = st.pending.action.intent as "gasto" | "pedido";
          const dedupe = registerPendingWithDedupe({
            operation_id: st.pending.operation_id,
            chat_id: msg.chat_id,
            intent,
            payload: v.data,
            timestampMs: nowMs()
          });

          if (!dedupe.ok) {
            clearPending(msg.chat_id);
            if (intent === "pedido") {
              return [`Este pedido ya existe con folio ${dedupe.duplicate_of.operation_id}`];
            }
            return [copy.duplicate(dedupe.duplicate_of.operation_id, dedupe.duplicate_of.status)];
          }

          st.pending.action.payload = v.data;
          st.pending.idempotency_key = dedupe.idempotency_key;
          st.pending.missing = [];
          st.pending.asked = undefined;
          setState(msg.chat_id, st);

          return [copy.summary(st.pending.action.intent, st.pending.action.payload, st.pending.operation_id)];
        }

        st.pending.missing = v.missing;
        const next = pickOneMissing(v.missing, st.pending.asked);
        st.pending.asked = next ?? undefined;
        setState(msg.chat_id, st);

        if (st.pending.action.intent === "pedido" && st.pending.asked === "fecha_hora_entrega" && orderDeliveryError) {
          return [deliveryDateTimePrompt(orderDeliveryError)];
        }

        return [copy.askFor(st.pending.asked ?? "unknown")];
      }

      return [copy.pendingOperation(st.pending.operation_id)];
    }

    const inventoryConsumeDraft = parseInventoryConsumeRequestSkill(msg.text);
    if (inventoryConsumeDraft.matched) {
      if (!inventoryConsumeEnabled) {
        return [copy.inventoryConsumeDisabled()];
      }

      if (!inventoryConsumeDraft.result.ok) {
        if (inventoryConsumeDraft.result.error === "inventory_consume_reference_missing") {
          const operation_id = newOperationId();
          const reference = extractOrderReferenceFromTextSkill(msg.text);
          const pendingPayload: Record<string, unknown> = {
            reference: {
              ...(reference.folio ? { folio: reference.folio } : {}),
              ...(reference.operation_id_ref ? { operation_id_ref: reference.operation_id_ref } : {})
            }
          };

          const pending = {
            operation_id,
            idempotency_key: operation_id,
            action: { intent: "inventory.consume" as const, payload: pendingPayload },
            missing: ["order_reference"],
            asked: "order_reference"
          };

          setState(msg.chat_id, { pending });
          return [copy.askFor("order_reference")];
        }

        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "inventory.consume",
          intent_source: "fallback",
          parse_source: inventoryConsumeDraft.result.source ?? "fallback",
          detail: inventoryConsumeDraft.result.error
        });
        return [copy.parseError(inventoryConsumeDraft.result.error)];
      }

      const operation_id = newOperationId();
      const payload = inventoryConsumeDraft.result.payload as Record<string, unknown>;
      const pending = {
        operation_id,
        idempotency_key: operation_id,
        action: { intent: "inventory.consume" as const, payload },
        missing: [],
        asked: undefined
      };

      setState(msg.chat_id, { pending });
      const register = registerPendingOperation({
        operation_id,
        chat_id: msg.chat_id,
        intent: "inventory.consume",
        payload,
        idempotency_key: operation_id
      });

      if (!register.inserted) {
        clearPending(msg.chat_id);
        return [
          copy.inventoryConsumeReplay(inventoryOrderRefLabelSkill(payload), register.operation.operation_id)
        ];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent: "inventory.consume",
        intent_source: "fallback",
        parse_source: inventoryConsumeDraft.result.source ?? "fallback"
      });

      return [copy.summary("inventory.consume", payload, operation_id)];
    }

    const paymentRecordDraft = parsePaymentRecordRequestSkill(msg.text);
    if (paymentRecordDraft.matched) {
      if (!paymentRecordDraft.result.ok) {
        if (
          paymentRecordDraft.result.error === "payment_record_reference_missing" ||
          paymentRecordDraft.result.error === "payment_record_estado_pago_missing"
        ) {
          const operation_id = newOperationId();
          const reference = extractOrderReferenceFromTextSkill(msg.text);
          const normalizedInput = normalizeForMatch(msg.text);
          const estadoPago = normalizedInput.match(/\b(pagado|pendiente|parcial)\b/)?.[1];

          const pendingPayload: Record<string, unknown> = {
            reference: {
              ...(reference.folio ? { folio: reference.folio } : {}),
              ...(reference.operation_id_ref ? { operation_id_ref: reference.operation_id_ref } : {})
            },
            payment: {
              ...(estadoPago ? { estado_pago: estadoPago } : {})
            }
          };

          const resolved = !hasOrderReferenceSkill(pendingPayload.reference)
            ? await tryResolvePaymentRecordReferenceByLookup({
              chat_id: msg.chat_id,
              text: msg.text
            })
            : { kind: "skip" as const };
          if (resolved.kind === "resolved") {
            pendingPayload.reference = resolved.reference as Record<string, unknown>;
          }

          const hasReference = hasOrderReferenceSkill(pendingPayload.reference);
          const hasEstadoPago = typeof (pendingPayload.payment as Record<string, unknown>)?.estado_pago === "string";
          const askField = !hasReference ? "order_reference" : (!hasEstadoPago ? "payment_estado_pago" : undefined);

          if (!askField) {
            const pending = {
              operation_id,
              idempotency_key: operation_id,
              action: { intent: "payment.record" as const, payload: pendingPayload },
              missing: [],
              asked: undefined
            };

            setState(msg.chat_id, { pending });
            const register = registerPendingOperation({
              operation_id,
              chat_id: msg.chat_id,
              intent: "payment.record",
              payload: pendingPayload,
              idempotency_key: operation_id
            });

            if (!register.inserted) {
              clearPending(msg.chat_id);
              return [
                copy.duplicate(register.operation.operation_id, register.operation.status)
              ];
            }

            return [copy.summary("payment.record", pendingPayload, operation_id)];
          }

          const pending = {
            operation_id,
            idempotency_key: operation_id,
            action: { intent: "payment.record" as const, payload: pendingPayload },
            missing: [askField === "payment_estado_pago" ? "payment.estado_pago" : "order_reference"],
            asked: askField
          };

          setState(msg.chat_id, { pending });
          if (resolved.kind === "ambiguous") {
            return [formatPaymentRecordAmbiguousReply({
              query: resolved.query,
              total: resolved.total,
              orders: resolved.orders
            })];
          }
          if (resolved.kind === "not_found") {
            return [
              `No encontré pedidos para "${resolved.query}". Compárteme el folio u operation_id para registrar el pago correcto.`
            ];
          }

          return [copy.askFor(askField ?? "order_update_patch")];
        }

        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "payment.record",
          intent_source: "fallback",
          parse_source: paymentRecordDraft.result.source ?? "fallback",
          detail: paymentRecordDraft.result.error
        });
        return [copy.parseError(paymentRecordDraft.result.error)];
      }

      const operation_id = newOperationId();
      const payload = paymentRecordDraft.result.payload as Record<string, unknown>;
      const pending = {
        operation_id,
        idempotency_key: operation_id,
        action: { intent: "payment.record" as const, payload },
        missing: [],
        asked: undefined
      };

      setState(msg.chat_id, { pending });
      const register = registerPendingOperation({
        operation_id,
        chat_id: msg.chat_id,
        intent: "payment.record",
        payload,
        idempotency_key: operation_id
      });

      if (!register.inserted) {
        clearPending(msg.chat_id);
        return [
          copy.duplicate(register.operation.operation_id, register.operation.status)
        ];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent: "payment.record",
        intent_source: "fallback",
        parse_source: paymentRecordDraft.result.source ?? "fallback"
      });

      return [copy.summary("payment.record", payload, operation_id)];
    }

    const orderUpdateDraft = parseOrderUpdateRequestSkill(msg.text);
    if (orderUpdateDraft.matched) {
      if (!orderUpdateDraft.result.ok) {
        if (
          orderUpdateDraft.result.error === "order_update_reference_missing" ||
          orderUpdateDraft.result.error === "order_update_patch_missing"
        ) {
          const operation_id = newOperationId();
          const reference = extractOrderReferenceFromTextSkill(msg.text);
          const extractedPatch = extractOrderUpdatePatchSkill(msg.text);
          const pendingPayload: Record<string, unknown> = {
            reference: {
              ...(reference.folio ? { folio: reference.folio } : {}),
              ...(reference.operation_id_ref ? { operation_id_ref: reference.operation_id_ref } : {})
            }
          };

          if (isObjectRecord(extractedPatch.patch)) {
            pendingPayload.patch = extractedPatch.patch;
          }

          let patchDeliveryError: "time_missing" | "invalid" | undefined;
          if (isObjectRecord(pendingPayload.patch)) {
            const normalizedPatch = normalizeOrderUpdatePatchDelivery({
              patch: pendingPayload.patch,
              timezone: orderReportTimezone,
              now: new Date(nowMs())
            });
            pendingPayload.patch = normalizedPatch.patch;
            patchDeliveryError = normalizedPatch.deliveryError;
          }

          const resolved = !hasOrderReferenceSkill(pendingPayload.reference)
            ? await tryResolveOrderUpdateReferenceByLookup({
              chat_id: msg.chat_id,
              text: msg.text
            })
            : { kind: "skip" as const };
          if (resolved.kind === "resolved") {
            pendingPayload.reference = resolved.reference as Record<string, unknown>;
          }

          const hasReference = hasOrderReferenceSkill(pendingPayload.reference);
          const hasPatch = hasOrderUpdatePatch(pendingPayload.patch);
          const askField = !hasReference
            ? "order_reference"
            : (!hasPatch || patchDeliveryError ? "order_update_patch" : undefined);
          const needsClarification = askField !== undefined;

          if (!needsClarification) {
            const pending = {
              operation_id,
              idempotency_key: operation_id,
              action: { intent: "order.update" as const, payload: pendingPayload },
              missing: [],
              asked: undefined
            };

            setState(msg.chat_id, { pending });
            const register = registerPendingOperation({
              operation_id,
              chat_id: msg.chat_id,
              intent: "order.update",
              payload: pendingPayload,
              idempotency_key: operation_id
            });

            if (!register.inserted) {
              clearPending(msg.chat_id);
              return [
                copy.duplicate(register.operation.operation_id, register.operation.status)
              ];
            }

            return [copy.summary("order.update", pendingPayload, operation_id)];
          }

          const pending = {
            operation_id,
            idempotency_key: operation_id,
            action: { intent: "order.update" as const, payload: pendingPayload },
            missing: [askField ?? "order_update_patch"],
            asked: askField
          };
          setState(msg.chat_id, { pending });

          if (resolved.kind === "ambiguous") {
            return [formatOrderUpdateAmbiguousReply({
              query: resolved.query,
              total: resolved.total,
              orders: resolved.orders
            })];
          }
          if (resolved.kind === "not_found") {
            return [
              `No encontré pedidos para "${resolved.query}". Compárteme el folio u operation_id para continuar con la actualización.`
            ];
          }

          if (askField === "order_update_patch" && patchDeliveryError) {
            return [deliveryDateTimePrompt(patchDeliveryError)];
          }

          return [copy.askFor(askField)];
        }

        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.update",
          intent_source: "fallback",
          parse_source: orderUpdateDraft.result.source ?? "fallback",
          detail: orderUpdateDraft.result.error
        });
        return [copy.parseError(orderUpdateDraft.result.error)];
      }

      const operation_id = newOperationId();
      const payloadRaw = orderUpdateDraft.result.payload as Record<string, unknown>;
      const patchRaw = isObjectRecord(payloadRaw.patch) ? payloadRaw.patch : {};
      const normalizedPatch = normalizeOrderUpdatePatchDelivery({
        patch: patchRaw,
        timezone: orderReportTimezone,
        now: new Date(nowMs())
      });
      const payload = {
        ...payloadRaw,
        patch: normalizedPatch.patch
      };

      if (normalizedPatch.deliveryError) {
        const pending = {
          operation_id,
          idempotency_key: operation_id,
          action: { intent: "order.update" as const, payload },
          missing: ["order_update_patch"],
          asked: "order_update_patch"
        };
        setState(msg.chat_id, { pending });
        return [deliveryDateTimePrompt(normalizedPatch.deliveryError)];
      }

      const pending = {
        operation_id,
        idempotency_key: operation_id,
        action: { intent: "order.update" as const, payload },
        missing: [],
        asked: undefined
      };

      setState(msg.chat_id, { pending });
      const register = registerPendingOperation({
        operation_id,
        chat_id: msg.chat_id,
        intent: "order.update",
        payload,
        idempotency_key: operation_id
      });

      if (!register.inserted) {
        clearPending(msg.chat_id);
        return [
          copy.duplicate(register.operation.operation_id, register.operation.status)
        ];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent: "order.update",
        intent_source: "fallback",
        parse_source: orderUpdateDraft.result.source ?? "fallback"
      });

      return [copy.summary("order.update", payload, operation_id)];
    }

    const orderCancelDraft = parseOrderCancelRequestSkill(msg.text);
    if (orderCancelDraft.matched) {
      if (!orderCancelDraft.result.ok) {
        if (orderCancelDraft.result.error === "order_cancel_reference_missing") {
          const operation_id = newOperationId();
          const inline = parseInlineJsonObject(msg.text.trim());
          const motivoFromJson = inline.ok === true ? trimString(inline.value.motivo) : undefined;
          const motivoFromText = msg.text.match(/\bmotivo\s*[:=]\s*(.+)$/i)?.[1]?.trim();
          const pendingPayload: Record<string, unknown> = {
            reference: {}
          };
          const motivo = motivoFromJson ?? motivoFromText;
          if (motivo) {
            pendingPayload.motivo = motivo;
          }

          const resolved = await tryResolveOrderCancelReferenceByLookup({
            chat_id: msg.chat_id,
            text: msg.text
          });
          if (resolved.kind === "resolved") {
            pendingPayload.reference = resolved.reference as Record<string, unknown>;
          }

          const pending = {
            operation_id,
            idempotency_key: operation_id,
            action: { intent: "order.cancel" as const, payload: pendingPayload },
            missing: ["order_reference"],
            asked: "order_reference"
          };

          setState(msg.chat_id, { pending });
          if (resolved.kind === "ambiguous") {
            return [
              `Encontré ${resolved.total} pedidos para "${resolved.query}". Compárteme el folio u operation_id para cancelar el correcto.`
            ];
          }
          if (resolved.kind === "not_found") {
            return [
              `No encontré pedidos para "${resolved.query}". Compárteme el folio u operation_id para continuar con la cancelación.`
            ];
          }
          if (resolved.kind === "resolved") {
            const register = registerPendingOperation({
              operation_id,
              chat_id: msg.chat_id,
              intent: "order.cancel",
              payload: pendingPayload,
              idempotency_key: operation_id
            });

            if (!register.inserted) {
              clearPending(msg.chat_id);
              const resolvedFolio =
                (pendingPayload.reference as Record<string, unknown> | undefined)?.folio ??
                register.operation.operation_id;
              return [`Este pedido ya fue cancelado con folio ${String(resolvedFolio)}`];
            }

            setState(msg.chat_id, {
              pending: {
                operation_id,
                idempotency_key: operation_id,
                action: { intent: "order.cancel", payload: pendingPayload },
                missing: [],
                asked: undefined
              }
            });

            return [copy.summary("order.cancel", pendingPayload, operation_id)];
          }
          return [copy.askFor("order_reference")];
        }

        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.cancel",
          intent_source: "fallback",
          parse_source: orderCancelDraft.result.source ?? "fallback",
          detail: orderCancelDraft.result.error
        });
        return [copy.parseError(orderCancelDraft.result.error)];
      }

      const operation_id = newOperationId();
      const payload = orderCancelDraft.result.payload as Record<string, unknown>;
      const pending = {
        operation_id,
        idempotency_key: operation_id,
        action: { intent: "order.cancel" as const, payload },
        missing: [],
        asked: undefined
      };

      setState(msg.chat_id, { pending });
      const register = registerPendingOperation({
        operation_id,
        chat_id: msg.chat_id,
        intent: "order.cancel",
        payload,
        idempotency_key: operation_id
      });

      if (!register.inserted) {
        clearPending(msg.chat_id);
        const payloadReference = isObjectRecord(payload.reference) ? payload.reference : undefined;
        const folio = payloadReference && typeof payloadReference.folio === "string"
          ? payloadReference.folio
          : register.operation.operation_id;
        return [`Este pedido ya fue cancelado con folio ${folio}`];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent: "order.cancel",
        intent_source: "fallback",
        parse_source: orderCancelDraft.result.source ?? "fallback"
      });

      return [copy.summary("order.cancel", payload, operation_id)];
    }

    const now = new Date(nowMs());
    let reportPeriod = detectOrderReportPeriod({
      text: msg.text,
      now,
      timezone: orderReportTimezone
    });
    let reportNeedsPeriod = detectOrderReportRequestWithoutPeriod({
      text: msg.text,
      now,
      timezone: orderReportTimezone
    });
    let scheduleDayPeriod = detectScheduleDayPeriod({
      text: msg.text,
      now,
      timezone: orderReportTimezone
    });
    let scheduleDayNeedsScope = detectScheduleDayRequestWithoutScope({
      text: msg.text,
      now,
      timezone: orderReportTimezone
    });
    let shoppingScope = detectShoppingListScope({
      text: msg.text,
      now,
      timezone: orderReportTimezone
    });
    let shoppingNeedsScope = detectShoppingListRequestWithoutScope({
      text: msg.text,
      now,
      timezone: orderReportTimezone
    });
    let lookupQuery = detectOrderLookupQuery(msg.text);
    let lookupNeedsQuery = detectOrderLookupRequestWithoutQuery(msg.text);
    let statusQuery = detectOrderStatusQuery(msg.text);
    let statusNeedsQuery = detectOrderStatusRequestWithoutQuery(msg.text);
    let quoteQuery = detectQuoteOrderQuery(msg.text);
    let adminHealthRequested = detectAdminHealthRequest(msg.text);
    let adminHealthIntentSource: "openclaw" | "fallback" | "custom" = "fallback";
    let adminConfigViewRequested = detectAdminConfigViewRequest(msg.text);
    let adminConfigViewIntentSource: "openclaw" | "fallback" | "custom" = "fallback";
    const codeReviewGraphRequest = parseCodeReviewGraphCommand(msg.text);

    if (codeReviewGraphRequest.requested) {
      if (!codeReviewGraphEnabled) {
        return [
          "Code Review Graph está deshabilitado. Activa CODE_REVIEW_GRAPH_ENABLE=1 y configura CODE_REVIEW_GRAPH_REPO_ALLOWLIST."
        ];
      }

      if (!codeReviewGraphRequest.operation) {
        return [formatCodeReviewGraphUsageReply()];
      }

      if (
        (codeReviewGraphRequest.operation === "get_impact_radius" ||
          codeReviewGraphRequest.operation === "get_review_context") &&
        !codeReviewGraphRequest.target_file
      ) {
        return ["Necesito la ruta del archivo objetivo para ejecutar esa operación de Code Review Graph."];
      }

      try {
        const graphResult = await executeCodeReviewGraphFn({
          chat_id: msg.chat_id,
          operation: codeReviewGraphRequest.operation,
          repo_root: codeReviewGraphRequest.repo_root,
          target_file: codeReviewGraphRequest.target_file,
          line_number: codeReviewGraphRequest.line_number,
          max_depth: codeReviewGraphRequest.max_depth,
          include_source: codeReviewGraphRequest.include_source
        });

        deps.onTrace?.({
          event: graphResult.status === "ok" ? "code_review_graph_succeeded" : "code_review_graph_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "admin.code_review_graph",
          intent_source: "fallback",
          detail: `${graphResult.operation};status=${graphResult.status};ref=${graphResult.trace_ref}`
        });

        return [formatCodeReviewGraphReply(graphResult)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        const traceRef = `code-review-graph:${newOperationId()}`;

        deps.onTrace?.({
          event: "code_review_graph_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "admin.code_review_graph",
          intent_source: "fallback",
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude ejecutar Code Review Graph en este momento. Ref: ${traceRef}`];
      }
    }

    if (openclawReadOnlyRoutingEnabled) {
      const routedReadOnly = await routeReadOnlyIntentFn({
        text: msg.text,
        enableQuote: openclawReadOnlyQuoteEnabled
      });

      deps.onTrace?.({
        event: "readonly_intent_routed",
        chat_id: msg.chat_id,
        strict_mode,
        intent: routedReadOnly.intent,
        intent_source: routedReadOnly.source,
        detail: routedReadOnly.openclaw_error
      });

      const hasDeterministicReadOnlyHint = Boolean(
        reportPeriod ||
        reportNeedsPeriod ||
        scheduleDayPeriod ||
        scheduleDayNeedsScope ||
        shoppingScope ||
        shoppingNeedsScope ||
        lookupQuery ||
        lookupNeedsQuery ||
        statusQuery ||
        statusNeedsQuery ||
        adminHealthRequested ||
        adminConfigViewRequested ||
        (openclawReadOnlyQuoteEnabled && quoteQuery)
      );

      if (routedReadOnly.intent === "unknown") {
        if (strict_mode && hasDeterministicReadOnlyHint) {
          return [
            "No pude resolver esa consulta con seguridad. Puedes intentar con una referencia más clara (folio u operation_id) o indicar periodo/fecha exacta."
          ];
        }
      } else {
        reportPeriod = undefined;
        reportNeedsPeriod = false;
        scheduleDayPeriod = undefined;
        scheduleDayNeedsScope = false;
        shoppingScope = undefined;
        shoppingNeedsScope = false;
        lookupQuery = undefined;
        lookupNeedsQuery = false;
        statusQuery = undefined;
        statusNeedsQuery = false;
        quoteQuery = undefined;
        adminHealthRequested = false;
        adminHealthIntentSource = routedReadOnly.source;
        adminConfigViewRequested = false;
        adminConfigViewIntentSource = routedReadOnly.source;

        if (routedReadOnly.intent === "admin.health") {
          adminHealthRequested = true;
        }
        if (routedReadOnly.intent === "admin.config.view") {
          adminConfigViewRequested = true;
        }

        if (routedReadOnly.intent === "report.orders") {
          reportPeriod = routedReadOnly.period;
          reportNeedsPeriod = !routedReadOnly.period;
        }

        if (routedReadOnly.intent === "schedule.day_view") {
          scheduleDayPeriod = routedReadOnly.day;
          scheduleDayNeedsScope = !routedReadOnly.day;
        }

        if (routedReadOnly.intent === "shopping.list.generate") {
          shoppingScope = routedReadOnly.scope;
          shoppingNeedsScope = !routedReadOnly.scope;
        }

        if (routedReadOnly.intent === "order.lookup") {
          lookupQuery = routedReadOnly.query;
          lookupNeedsQuery = !routedReadOnly.query;
        }

        if (routedReadOnly.intent === "order.status") {
          statusQuery = routedReadOnly.query;
          statusNeedsQuery = !routedReadOnly.query;
        }

        if (routedReadOnly.intent === "quote.order" && openclawReadOnlyQuoteEnabled) {
          const extracted = trimString(routedReadOnly.query);
          quoteQuery = extracted ?? detectQuoteOrderQuery(msg.text);
        }
      }
    }

    if (adminHealthRequested) {
      try {
        const health = await executeAdminHealthFn({
          chat_id: msg.chat_id
        });

        deps.onTrace?.({
          event: "admin_health_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "admin.health",
          intent_source: adminHealthIntentSource,
          detail: `status=${health.status};trace_ref=${health.trace_ref}`
        });

        return [formatAdminHealthReply(health)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        const traceRef = `admin-health:${newOperationId()}`;

        deps.onTrace?.({
          event: "admin_health_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "admin.health",
          intent_source: adminHealthIntentSource,
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude consultar la salud operativa en este momento. Ref: ${traceRef}`];
      }
    }

    if (adminConfigViewRequested) {
      try {
        const configView = await executeAdminConfigViewFn({
          chat_id: msg.chat_id
        });

        deps.onTrace?.({
          event: "admin_config_view_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "admin.config.view",
          intent_source: adminConfigViewIntentSource,
          detail: `status=${configView.status};trace_ref=${configView.trace_ref}`
        });

        return [formatAdminConfigViewReply(configView)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        const traceRef = `admin-config-view:${newOperationId()}`;

        deps.onTrace?.({
          event: "admin_config_view_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "admin.config.view",
          intent_source: adminConfigViewIntentSource,
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude consultar la configuracion operativa en este momento. Ref: ${traceRef}`];
      }
    }

    if (scheduleDayNeedsScope) {
      const operation_id = newOperationId();
      setState(msg.chat_id, {
        pending: {
          operation_id,
          idempotency_key: operation_id,
          action: {
            intent: "schedule.day_view",
            payload: {}
          },
          missing: ["schedule_day_query"],
          asked: "schedule_day_query"
        }
      });
      return [copy.askFor("schedule_day_query")];
    }

    if (reportNeedsPeriod) {
      const operation_id = newOperationId();
      setState(msg.chat_id, {
        pending: {
          operation_id,
          idempotency_key: operation_id,
          action: {
            intent: "reporte",
            payload: {}
          },
          missing: ["order_report_period"],
          asked: "order_report_period"
        }
      });
      return [copy.askFor("order_report_period")];
    }

    if (scheduleDayPeriod) {
      try {
        const dayView = await executeScheduleDayViewFn({
          chat_id: msg.chat_id,
          day: scheduleDayPeriod
        });

        deps.onTrace?.({
          event: "schedule_day_view_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "schedule.day_view",
          intent_source: "fallback",
          detail: `${dayView.detail};trace_ref=${dayView.trace_ref};inconsistencies=${dayView.inconsistencies.length}`
        });

        return [formatScheduleDayViewReply(dayView)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        const traceRef = `schedule-day-view:${newOperationId()}`;

        deps.onTrace?.({
          event: "schedule_day_view_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "schedule.day_view",
          intent_source: "fallback",
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude generar la agenda del día en este momento. Ref: ${traceRef}`];
      }
    }

    if (reportPeriod) {
      try {
        const report = await executeOrderReportFn({
          chat_id: msg.chat_id,
          period: reportPeriod
        });

        deps.onTrace?.({
          event: "order_report_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "reporte",
          intent_source: "fallback",
          detail: `period=${report.period.type}:${report.period.label};total=${report.total};trace_ref=${report.trace_ref};inconsistencies=${report.inconsistencies.length}`
        });

        return [formatOrderReportReply(report)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        const traceRef = `report-orders:${newOperationId()}`;

        deps.onTrace?.({
          event: "order_report_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "reporte",
          intent_source: "fallback",
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude consultar pedidos en este momento. Ref: ${traceRef}`];
      }
    }

    if (shoppingNeedsScope) {
      const operation_id = newOperationId();
      setState(msg.chat_id, {
        pending: {
          operation_id,
          idempotency_key: operation_id,
          action: {
            intent: "shopping.list.generate",
            payload: {}
          },
          missing: ["shopping_list_query"],
          asked: "shopping_list_query"
        }
      });
      return [copy.askFor("shopping_list_query")];
    }

    if (shoppingScope) {
      try {
        const shoppingList = await executeShoppingListFn({
          chat_id: msg.chat_id,
          scope: shoppingScope
        });

        deps.onTrace?.({
          event: "shopping_list_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "shopping.list.generate",
          intent_source: "fallback",
          detail: `scope=${shoppingList.scope.type}:${shoppingList.scope.label};orders=${shoppingList.totalOrders}`
        });

        return [formatShoppingListReply(shoppingList)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);

        deps.onTrace?.({
          event: "shopping_list_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "shopping.list.generate",
          intent_source: "fallback",
          detail: safeDetail
        });

        return ["No pude generar la lista de insumos en este momento. Intenta de nuevo en unos minutos."];
      }
    }

    if (statusNeedsQuery) {
      const operation_id = newOperationId();
      setState(msg.chat_id, {
        pending: {
          operation_id,
          idempotency_key: operation_id,
          action: {
            intent: "order.status",
            payload: {}
          },
          missing: ["order_status_query"],
          asked: "order_status_query"
        }
      });
      return [copy.askFor("order_status_query")];
    }

    if (lookupNeedsQuery) {
      const operation_id = newOperationId();
      setState(msg.chat_id, {
        pending: {
          operation_id,
          idempotency_key: operation_id,
          action: {
            intent: "order.lookup",
            payload: {}
          },
          missing: ["order_lookup_query"],
          asked: "order_lookup_query"
        }
      });
      return [copy.askFor("order_lookup_query")];
    }

    if (statusQuery) {
      try {
        const status = await executeOrderStatusFn({
          chat_id: msg.chat_id,
          query: statusQuery
        });

        deps.onTrace?.({
          event: "order_status_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.status",
          intent_source: "fallback",
          detail: `query=${status.query};total=${status.total};trace_ref=${status.trace_ref}`
        });

        return [formatOrderStatusReply(status)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        if (safeDetail.includes("order_status_query_invalid")) {
          return [copy.askFor("order_status_query")];
        }
        const traceRef = `order-status:${newOperationId()}`;

        deps.onTrace?.({
          event: "order_status_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.status",
          intent_source: "fallback",
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude consultar el estado de ese pedido en este momento. Ref: ${traceRef}`];
      }
    }

    if (quoteQuery) {
      const qty = parseQuoteQuantityFromText(quoteQuery);
      if (!qty) {
        const operation_id = newOperationId();
        setState(msg.chat_id, {
          pending: {
            operation_id,
            idempotency_key: operation_id,
            action: {
              intent: "quote.order",
              payload: {
                query: quoteQuery,
                quote_id: `quote-${operation_id}`
              }
            },
            missing: ["quote.quantity"],
            asked: "quote_quantity"
          }
        });
        return ["¿Para cuántas piezas/porciones lo cotizo?"];
      }

      const shipping = parseQuoteShippingFromText(quoteQuery);
      if (!shipping) {
        const operation_id = newOperationId();
        setState(msg.chat_id, {
          pending: {
            operation_id,
            idempotency_key: operation_id,
            action: {
              intent: "quote.order",
              payload: {
                query: quoteQuery,
                quote_id: `quote-${operation_id}`
              }
            },
            missing: ["quote.shipping"],
            asked: "quote_shipping"
          }
        });
        return ["¿La entrega será para recoger en tienda o envío a domicilio?"];
      }

      let quote: QuoteOrderResult;
      try {
        quote = await executeQuoteOrderFn({
          chat_id: msg.chat_id,
          query: quoteQuery
        });
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);

        deps.onTrace?.({
          event: "quote_order_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "quote.order",
          intent_source: "fallback",
          detail: safeDetail
        });

        if (safeDetail === "quote_order_product_not_found") {
          const operation_id = newOperationId();
          setState(msg.chat_id, {
            pending: {
              operation_id,
              idempotency_key: operation_id,
              action: {
                intent: "quote.order",
                payload: {
                  query: quoteQuery,
                  quote_id: `quote-${operation_id}`
                }
              },
              missing: ["quote.product"],
              asked: "quote_product"
            }
          });
          return ["No pude identificar el producto base. ¿Qué producto quieres cotizar? Ejemplo: pastel mediano o caja de 12 cupcakes."];
        }

        if (safeDetail === "quote_order_shipping_zone_missing" || safeDetail === "quote_order_shipping_zone_ambiguous") {
          const operation_id = newOperationId();
          setState(msg.chat_id, {
            pending: {
              operation_id,
              idempotency_key: operation_id,
              action: {
                intent: "quote.order",
                payload: {
                  query: quoteQuery,
                  quote_id: `quote-${operation_id}`
                }
              },
              missing: ["quote.shipping_zone"],
              asked: QUOTE_SHIPPING_ZONE_FIELD
            }
          });
          return [quoteShippingZonePrompt()];
        }

        if (safeDetail === "quote_order_modifier_ambiguous") {
          const operation_id = newOperationId();
          setState(msg.chat_id, {
            pending: {
              operation_id,
              idempotency_key: operation_id,
              action: {
                intent: "quote.order",
                payload: {
                  query: quoteQuery,
                  quote_id: `quote-${operation_id}`
                }
              },
              missing: ["quote.modifier"],
              asked: QUOTE_MODIFIER_FIELD
            }
          });
          return [quoteModifierClarificationPrompt()];
        }

        return ["No pude generar la cotización en este momento. Intenta de nuevo en unos minutos."];
      }

      const customizationField = nextQuoteCustomizationField(quoteQuery);
      if (customizationField) {
        const operation_id = newOperationId();
        const nextPayload: Record<string, unknown> = {
          query: quoteQuery,
          quote_id: `quote-${operation_id}`
        };
        if (quote.optionSuggestions) {
          nextPayload.quote_option_suggestions = quote.optionSuggestions;
        }
        setState(msg.chat_id, {
          pending: {
            operation_id,
            idempotency_key: operation_id,
            action: {
              intent: "quote.order",
              payload: nextPayload
            },
            missing: [customizationField],
            asked: customizationField
          }
        });
        return [quotePromptForField(customizationField, quote.optionSuggestions?.[customizationField])];
      }

      deps.onTrace?.({
        event: "quote_order_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent: "quote.order",
        intent_source: "fallback",
        detail: `product=${quote.product.key};total=${quote.total}`
      });

      const operation_id = newOperationId();
      const quoteId = `quote-${operation_id}`;
      const quoteOrderPayload = buildOrderPayloadFromQuote({
        query: quoteQuery,
        quote,
        quoteId
      });
      const quoteSnapshot = buildStoredQuoteSnapshot(quote);
      setState(msg.chat_id, {
        pending: {
          operation_id,
          idempotency_key: operation_id,
          action: {
            intent: "quote.order",
            payload: {
              query: quoteQuery,
              quote_id: quoteId,
              quote_snapshot: quoteSnapshot,
              quote_order_payload: quoteOrderPayload
            }
          },
          missing: [QUOTE_TO_ORDER_CONFIRM_FIELD],
          asked: QUOTE_TO_ORDER_CONFIRM_FIELD
        }
      });
      return [formatQuoteReplyWithOrderCta(quote)];
    }

    if (lookupQuery) {
      try {
        const lookup = await executeOrderLookupFn({
          chat_id: msg.chat_id,
          query: lookupQuery
        });

        deps.onTrace?.({
          event: "order_lookup_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.lookup",
          intent_source: "fallback",
          detail: `query=${lookup.query};total=${lookup.total};trace_ref=${lookup.trace_ref}`
        });

        return [formatOrderLookupReply(lookup)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        if (safeDetail.includes("order_lookup_query_invalid")) {
          return [copy.askFor("order_lookup_query")];
        }
        const traceRef = `order-lookup:${newOperationId()}`;

        deps.onTrace?.({
          event: "order_lookup_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.lookup",
          intent_source: "fallback",
          detail: `${safeDetail};ref=${traceRef}`
        });

        return [`No pude consultar ese pedido en este momento. Ref: ${traceRef}`];
      }
    }

    let intent: Intent;
    let intentSource = "openclaw";

    if (routeIntentFn) {
      intent = await routeIntentFn(msg.text);
      intentSource = "custom";
    } else {
      const routed = await routeIntentDetailedFn(msg.text);
      intent = routed.intent;
      intentSource = routed.source;

      deps.onTrace?.({
        event: "intent_routed",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        detail: routed.openclaw_error
      });
    }

    if (intent === "ayuda") {
      return [copy.help()];
    }

    if (intent === "unknown") {
      return [copy.unknown()];
    }

    const operation_id = newOperationId();

    if (intent === "web") {
      if (!webChatEnabled) {
        return [copy.webDisabled()];
      }

      const parsed = await parseWebFn(msg.text);
      if (!parsed.ok) {
        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent,
          intent_source: intentSource,
          parse_source: parsed.source ?? "unknown",
          detail: parsed.error
        });
        return [copy.parseError(parsed.error)];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        parse_source: parsed.source ?? "fallback"
      });

      const vWeb = validateWebPayloadDraft(parsed.payload);
      const pending = {
        operation_id,
        action: { intent: "web" as const, payload: parsed.payload },
        missing: vWeb.ok ? [] : vWeb.missing,
        asked: vWeb.ok ? undefined : pickOneMissing(vWeb.missing)
      };

      setState(msg.chat_id, { pending });

      if (vWeb.ok) {
        const register = registerPendingOperation({
          operation_id,
          chat_id: msg.chat_id,
          intent: "web",
          payload: vWeb.data,
          idempotency_key: operation_id
        });

        if (!register.inserted) {
          clearPending(msg.chat_id);
          return [
            copy.duplicate(register.operation.operation_id, register.operation.status)
          ];
        }

        setState(msg.chat_id, {
          pending: {
            ...pending,
            idempotency_key: operation_id,
            action: { intent: "web", payload: vWeb.data as unknown as Record<string, unknown> },
            missing: [],
            asked: undefined
          }
        });

        return [copy.summary(intent, vWeb.data as unknown as Record<string, unknown>, operation_id)];
      }

      return [copy.askFor(pending.asked ?? "unknown")];
    }

    if (intent === "gasto") {
      const parsed = await parseExpenseFn(msg.text);
      if (!parsed.ok) {
        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent,
          intent_source: intentSource,
          parse_source: parsed.source ?? "unknown",
          detail: parsed.error
        });
        return [copy.parseError(parsed.error)];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        parse_source: parsed.source ?? "custom"
      });

      const v = validateWith(ExpenseSchema, parsed.payload);
      const pending = {
        operation_id,
        action: { intent: "gasto" as const, payload: parsed.payload },
        missing: v.ok ? [] : v.missing,
        asked: v.ok ? undefined : pickOneMissing(v.missing)
      };

      setState(msg.chat_id, { pending });

      if (v.ok) {
        const dedupe = registerPendingWithDedupe({
          operation_id,
          chat_id: msg.chat_id,
          intent,
          payload: v.data,
          timestampMs: nowMs()
        });

        if (!dedupe.ok) {
          clearPending(msg.chat_id);
          return [
            copy.duplicate(dedupe.duplicate_of.operation_id, dedupe.duplicate_of.status)
          ];
        }

        const full = v.data;
        setState(msg.chat_id, {
          pending: {
            ...pending,
            idempotency_key: dedupe.idempotency_key,
            action: { intent: "gasto", payload: full },
            missing: [],
            asked: undefined
          }
        });

        return [copy.summary(intent, full, operation_id)];
      }

      return [copy.askFor(pending.asked ?? "unknown")];
    }

    const parsed = await parseOrderFn(msg.text);
    if (!parsed.ok) {
      deps.onTrace?.({
        event: "parse_failed",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        parse_source: parsed.source ?? "unknown",
        detail: parsed.error
      });
      return [copy.parseError(parsed.error)];
    }

    deps.onTrace?.({
      event: "parse_succeeded",
      chat_id: msg.chat_id,
      strict_mode,
      intent,
      intent_source: intentSource,
      parse_source: parsed.source ?? "custom"
    });

    return startPendingOrderFlow({
      chat_id: msg.chat_id,
      operation_id,
      payload: parsed.payload
    });
  }

  return { handleMessage };
}
