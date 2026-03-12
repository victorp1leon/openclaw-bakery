import { v4 as uuidv4 } from "uuid";

import { isCancel, isConfirm } from "../guards/confirmationGuard";
import { registerPendingWithDedupe } from "../guards/dedupeGuard";
import { pickOneMissing } from "../guards/missingFieldPicker";
import type { RateLimitGuard } from "../guards/rateLimitGuard";
import { validateWith } from "../guards/validationGuard";
import { type Expense, ExpenseSchema } from "../schemas/expense";
import { type Order, OrderSchema } from "../schemas/order";
import { type Intent, routeIntentDetailed, type RoutedIntent } from "../skills/intentRouter";
import { parseExpense, parseOrder, type ParseSource } from "../skills/parser";
import { registerPendingOperation, upsertOperation } from "../state/operations";
import { clearPending, getState, setState } from "../state/stateStore";
import { appendExpenseTool } from "../tools/expense/appendExpense";
import { appendOrderTool } from "../tools/order/appendOrder";
import {
  createCancelOrderTool,
  type OrderCancelExecutionPayload,
  type OrderCancelReference
} from "../tools/order/cancelOrder";
import { createCardTool } from "../tools/order/createCard";
import { createLookupOrderTool, type OrderLookupResult } from "../tools/order/lookupOrder";
import { createOrderCardSyncTool, type TrelloCardSnapshot } from "../tools/order/orderCardSync";
import { createQuoteOrderTool, type QuoteOrderResult } from "../tools/order/quoteOrder";
import {
  createRecordPaymentTool,
  type PaymentRecordExecutionPayload,
  type PaymentRecordInput,
  type PaymentRecordReference
} from "../tools/order/recordPayment";
import { createOrderStatusTool, type OrderStatusResult } from "../tools/order/orderStatus";
import { createReportOrdersTool, type OrderReportPeriod, type OrderReportResult } from "../tools/order/reportOrders";
import {
  createUpdateOrderTool,
  type OrderUpdateExecutionPayload,
  type OrderUpdateReference
} from "../tools/order/updateOrder";
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

const ORDER_UPDATE_PATCH_FIELDS = new Set([
  "fecha_hora_entrega",
  "nombre_cliente",
  "telefono",
  "producto",
  "descripcion_producto",
  "cantidad",
  "sabor_pan",
  "sabor_relleno",
  "tipo_envio",
  "direccion",
  "estado_pago",
  "total",
  "moneda",
  "notas"
]);
const ORDER_REFERENCE_TOKEN_PATTERN = /^[a-z0-9][a-z0-9_-]{2,}$/i;
const ORDER_REFERENCE_RESERVED_VALUES = new Set([
  "pendiente",
  "pagado",
  "parcial",
  "confirmar",
  "cancelar",
  "si",
  "no",
  "ok",
  "listo"
]);

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

  if (/\beste\s+mes\b/.test(args.normalized)) {
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

  if (/\beste\s+ano\b/.test(args.normalized)) {
    return {
      type: "year",
      year: current.year,
      label: "este año"
    };
  }

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

  const hasPeriodHint = /\b(hoy|manana|semana|mes|ano)\b/.test(normalized) || /\b\d{1,2}\s+de\s+[a-z]+\b/.test(normalized);
  if (!hasPeriodHint) return undefined;

  const hasQueryVerb = /\b(que|cuales|dame|mostrar|muestrame|ver|lista|listar|tengo|recuerdame|consulta|consultar)\b/.test(
    normalized
  );
  const hasPlural = /\bpedidos\b/.test(normalized);
  const startsAsCreateOrder = /^\s*pedido\b/.test(normalized);

  if (startsAsCreateOrder && !hasQueryVerb && !hasPlural) return undefined;
  if (!hasQueryVerb && !hasPlural) return undefined;

  const dayPeriod = parseOrderReportDayPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (dayPeriod) return dayPeriod;

  const weekPeriod = parseOrderReportWeekPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (weekPeriod) return weekPeriod;

  const monthPeriod = parseOrderReportMonthPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (monthPeriod) return monthPeriod;

  const yearPeriod = parseOrderReportYearPeriod({
    normalized,
    now: args.now,
    timezone: args.timezone
  });
  if (yearPeriod) return yearPeriod;

  return undefined;
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

function appendQuoteHint(query: string, hint: string): string {
  const merged = `${query} ${hint}`.trim();
  return merged.replace(/\s+/g, " ");
}

function formatOrderReportReply(report: OrderReportResult): string {
  const label = report.period.label;
  if (report.total === 0) {
    return `No encontré pedidos para ${label}.`;
  }

  const maxRows = 20;
  const shown = report.orders.slice(0, maxRows);
  const lines = shown.map((order, idx) => {
    const qty = order.cantidad != null ? `x${order.cantidad}` : "x?";
    const total = order.total != null ? `${order.total}${order.moneda ? ` ${order.moneda}` : ""}` : "-";
    const shipping = order.tipo_envio ?? "-";
    const payment = order.estado_pago ?? "-";
    return `${idx + 1}. ${order.fecha_hora_entrega} | ${order.nombre_cliente} | ${order.producto} ${qty} | ${shipping} | ${payment} | ${total}`;
  });

  const extra = report.total > shown.length ? `\n... y ${report.total - shown.length} más` : "";
  return `Pedidos para ${label} (${report.total}):\n${lines.join("\n")}${extra}`;
}

function formatOrderLookupReply(result: OrderLookupResult): string {
  if (result.total === 0) {
    return `No encontré pedidos para "${result.query}".`;
  }

  const maxRows = 10;
  const shown = result.orders.slice(0, maxRows);
  const lines = shown.map((order, idx) => {
    const qty = order.cantidad != null ? `x${order.cantidad}` : "x?";
    const total = order.total != null ? `${order.total}${order.moneda ? ` ${order.moneda}` : ""}` : "-";
    const payment = order.estado_pago ?? "-";
    return `${idx + 1}. ${order.folio || "-"} | ${order.fecha_hora_entrega} | ${order.nombre_cliente} | ${order.producto} ${qty} | ${payment} | ${total}`;
  });

  const extra = result.total > shown.length ? `\n... y ${result.total - shown.length} más` : "";
  return `Pedidos encontrados para "${result.query}" (${result.total}):\n${lines.join("\n")}${extra}`;
}

function formatOrderStatusReply(result: OrderStatusResult): string {
  if (result.total === 0) {
    return `No encontré el estado para "${result.query}".`;
  }

  const maxRows = 10;
  const shown = result.orders.slice(0, maxRows);
  const lines = shown.map((order, idx) => {
    const payment = order.estado_pago ?? "-";
    const total = order.total != null ? `${order.total}${order.moneda ? ` ${order.moneda}` : ""}` : "-";
    return `${idx + 1}. ${order.folio || "-"} | ${order.fecha_hora_entrega} | ${order.nombre_cliente} | ${order.producto} | pago:${payment} | estado:${order.estado_operativo} | ${total}`;
  });

  const extra = result.total > shown.length ? `\n... y ${result.total - shown.length} más` : "";
  return `Estado de pedidos para "${result.query}" (${result.total}):\n${lines.join("\n")}${extra}`;
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

function sanitizeOrderReferenceValue(value: unknown): string | undefined {
  const out = trimString(value);
  if (!out) return undefined;
  if (!ORDER_REFERENCE_TOKEN_PATTERN.test(out)) return undefined;
  const normalized = normalizeForMatch(out);
  if (ORDER_REFERENCE_RESERVED_VALUES.has(normalized)) return undefined;
  return out;
}

function extractOrderReferenceFromText(text: string): { folio?: string; operation_id_ref?: string } {
  const folio = sanitizeOrderReferenceValue(text.match(/\bfolio\s*[:=]?\s*([a-z0-9_-]{3,})\b/i)?.[1]);
  const operationId = sanitizeOrderReferenceValue(text.match(/\b(?:operation_id|operacion|id)\s*[:=]?\s*([a-z0-9_-]{3,})\b/i)?.[1]);
  return {
    folio,
    operation_id_ref: operationId
  };
}

function hasOrderReference(value: unknown): boolean {
  if (!isObjectRecord(value)) return false;
  const folio = sanitizeOrderReferenceValue(value.folio);
  const operationId = sanitizeOrderReferenceValue(value.operation_id_ref);
  return Boolean(folio || operationId);
}

function referenceFromFreeText(text: string): { folio?: string; operation_id_ref?: string } {
  const fromTagged = extractOrderReferenceFromText(text);
  if (fromTagged.folio || fromTagged.operation_id_ref) return fromTagged;

  const fallback = sanitizeOrderReferenceValue(text);
  if (fallback) {
    return { folio: fallback };
  }
  return {};
}

function parseOrderUpdatePatchFromText(text: string): Record<string, unknown> | undefined {
  const normalized = normalizeForMatch(text);
  const patch: Record<string, unknown> = {};

  const deliveryMatch = text.match(
    /\b(?:fecha(?:\s+y)?\s*hora(?:\s+de)?\s*entrega|fecha(?:\s+de)?\s+entrega|entrega)\s*(?:a|para|=|:)?\s*((?:\d{4}[/-]\d{1,2}[/-]\d{1,2})(?:[ t]\d{1,2}:\d{2})?)\b/i
  )?.[1];
  if (deliveryMatch) {
    patch.fecha_hora_entrega = deliveryMatch.replace(/[Tt]/g, " ").replace(/\//g, "-").trim();
  }

  const paymentMatch =
    normalized.match(/\bestado\s+de\s+pago\s*(?:a|en|=|:|como)?\s*(pagado|pendiente|parcial)\b/)?.[1] ??
    (/\b(?:pago|abono)\b/.test(normalized) ? normalized.match(/\b(pagado|pendiente|parcial)\b/)?.[1] : undefined);
  if (paymentMatch) {
    patch.estado_pago = paymentMatch;
  }

  const shippingValue =
    text.match(
      /\b(?:tipo\s+de?\s*envio|envio)\s*(?:a|en|=|:|para)?\s*(envio_domicilio|recoger_en_tienda|envio a domicilio|a domicilio|recoger en tienda|retiro en tienda)\b/i
    )?.[1] ??
    text.match(/\b(envio a domicilio|a domicilio|recoger en tienda|retiro en tienda)\b/i)?.[1];
  if (shippingValue) {
    patch.tipo_envio = normalizeTipoEnvioInput(shippingValue);
  }

  const quantityMatch = normalized.match(/\b(?:cantidad|piezas?|unidades?)\s*(?:a|=|:)?\s*(\d+)\b/)?.[1];
  if (quantityMatch) {
    patch.cantidad = Number(quantityMatch);
  }

  const totalMatch = normalized.match(/\btotal\s*(?:a|=|:)?\s*(\d+(?:[.,]\d+)?)\b/)?.[1];
  if (totalMatch) {
    patch.total = Number(totalMatch.replace(",", "."));
  }

  const customerMatch = text.match(/\b(?:nombre(?:\s+del)?\s+cliente|cliente)\s*(?:a|=|:)\s*([^,.;\n]+)/i)?.[1]?.trim();
  if (customerMatch) {
    patch.nombre_cliente = customerMatch;
  }

  const productMatch = text.match(/\bproducto\s*(?:a|=|:)\s*([^,.;\n]+)/i)?.[1]?.trim();
  if (productMatch) {
    patch.producto = productMatch;
  }

  const addressMatch = text.match(/\bdireccion\s*(?:a|=|:)\s*([^,;\n]+)/i)?.[1]?.trim();
  if (addressMatch) {
    patch.direccion = addressMatch;
  }

  const notesMatch = text.match(/\b(?:nota|notas)\s*(?:a|=|:)\s*(.+)$/i)?.[1]?.trim();
  if (notesMatch) {
    patch.notas = notesMatch;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

function parseOrderUpdateRequest(text: string):
  | { matched: false }
  | { matched: true; result: ParseResult } {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasMutationVerb = /\b(actualiza|actualizar|actualizacion|modifica|modificar|cambia|cambiar)\b/.test(normalized);
  if (!hasOrderWord || !hasMutationVerb) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_payload_json_invalid" }
    };
  }

  const reference: OrderUpdateReference = {};
  let patch: Record<string, unknown> | undefined;

  if (inline.ok === true) {
    const payload = inline.value;

    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }

    if (isObjectRecord(payload.patch)) {
      patch = { ...payload.patch };
    } else {
      const filteredEntries = Object.entries(payload).filter(([key]) => ORDER_UPDATE_PATCH_FIELDS.has(key));
      if (filteredEntries.length > 0) {
        patch = Object.fromEntries(filteredEntries);
      }
    }
  }

  if (!patch) {
    patch = parseOrderUpdatePatchFromText(text);
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_reference_missing" }
    };
  }

  if (!patch || Object.keys(patch).length === 0) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_patch_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference,
        patch
      }
    }
  };
}

function parseOrderCancelRequest(text: string):
  | { matched: false }
  | { matched: true; result: ParseResult } {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasCancelVerb = /\b(cancela|cancelar|cancelame|anula|anular)\b/.test(normalized);
  if (!hasOrderWord || !hasCancelVerb) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_cancel_payload_json_invalid" }
    };
  }

  const reference: OrderCancelReference = {};
  let motivo = text.match(/\bmotivo\s*[:=]\s*(.+)$/i)?.[1]?.trim();

  if (inline.ok === true) {
    const payload = inline.value;

    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }

    const motivoInline = trimString(payload.motivo);
    if (motivoInline) motivo = motivoInline;
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_cancel_reference_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference,
        ...(motivo ? { motivo } : {})
      }
    }
  };
}

function parsePaymentAmountFromText(text: string): number | undefined {
  const amountMatch = text.match(/\b(?:monto|abono|pago)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i);
  if (!amountMatch?.[1]) return undefined;
  const parsed = Number(amountMatch[1].replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePaymentRecordRequest(text: string):
  | { matched: false }
  | { matched: true; result: ParseResult } {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasMutationVerb = /\b(registra|registrar|marca|marcar|aplica|aplicar|abona|abonar|liquida|liquidar)\b/.test(normalized);
  const hasPaymentHint = /\b(pago|abono|liquidacion)\b/.test(normalized) || /\bestado\s+de\s+pago\b/.test(normalized);
  if (!hasOrderWord || !hasMutationVerb || !hasPaymentHint) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_payload_json_invalid" }
    };
  }

  const reference: PaymentRecordReference = {};
  let payment: Record<string, unknown> | undefined;

  if (inline.ok === true) {
    const payload = inline.value;
    if (isObjectRecord(payload.patch)) {
      return { matched: false };
    }

    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }

    if (isObjectRecord(payload.payment)) {
      payment = { ...payload.payment };
    } else {
      const inlinePayment: Record<string, unknown> = {};
      const inlineEstado = trimString(payload.estado_pago);
      if (inlineEstado) inlinePayment.estado_pago = inlineEstado;

      const inlineMetodo = trimString(payload.metodo);
      if (inlineMetodo) inlinePayment.metodo = inlineMetodo;

      if (payload.monto != null && String(payload.monto).trim() !== "") {
        inlinePayment.monto = payload.monto;
      }

      const inlineNotas = trimString(payload.notas);
      if (inlineNotas) inlinePayment.notas = inlineNotas;

      if (Object.keys(inlinePayment).length > 0) payment = inlinePayment;
    }
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_reference_missing" }
    };
  }

  if (!payment) {
    payment = {};
    const estadoPago = normalized.match(/\b(pagado|pendiente|parcial)\b/)?.[1];
    if (estadoPago) {
      payment.estado_pago = estadoPago;
    }

    const monto = parsePaymentAmountFromText(text);
    if (monto != null) {
      payment.monto = monto;
    }

    const metodo = normalized.match(/\b(efectivo|transferencia|tarjeta|otro)\b/)?.[1];
    if (metodo) {
      payment.metodo = metodo;
    }

    const nota = text.match(/\bnota\s*[:=]\s*(.+)$/i)?.[1]?.trim();
    if (nota) {
      payment.notas = nota;
    }
  }

  if (typeof payment.estado_pago !== "string" || payment.estado_pago.trim().length === 0) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_estado_pago_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference,
        payment
      }
    }
  };
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

function mergeField(payload: Record<string, unknown>, field: string, userText: string): Record<string, unknown> {
  const t = userText.trim();
  if (field === "monto" || field === "cantidad" || field === "total") return { ...payload, [field]: Number(t) };
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
  const nowMs = deps.nowMs ?? (() => Date.now());
  const newOperationId = deps.newOperationId ?? uuidv4;
  const routeIntentDetailedFn = deps.routeIntentDetailedFn ?? routeIntentDetailed;
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
  const executeQuoteOrderFn = deps.executeQuoteOrderFn ?? createQuoteOrderTool();
  const executeOrderUpdateFn = deps.executeOrderUpdateFn ?? createUpdateOrderTool();
  const executeOrderCancelFn = deps.executeOrderCancelFn ?? createCancelOrderTool();
  const executePaymentRecordFn = deps.executePaymentRecordFn ?? createRecordPaymentTool();
  const orderCardSync = deps.orderCardSync ?? createOrderCardSyncTool();
  const orderReportTimezone = deps.orderReportTimezone?.trim() || REPORT_DEFAULT_TIMEZONE;
  const copy = createBotCopy(deps.botPersona);
  const webChatEnabled = deps.webChatEnabled ?? true;
  const rateLimiter = deps.rateLimiter;

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

        try {
          const quote = await executeQuoteOrderFn({
            chat_id: msg.chat_id,
            query
          });

          deps.onTrace?.({
            event: "quote_order_succeeded",
            chat_id: msg.chat_id,
            strict_mode,
            intent: "quote.order",
            intent_source: "fallback",
            detail: `product=${quote.product.key};total=${quote.total}`
          });

          clearPending(msg.chat_id);
          return [formatQuoteOrderReply(quote)];
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

          clearPending(msg.chat_id);
          return ["No pude generar la cotización en este momento. Intenta de nuevo en unos minutos."];
        }
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
              event: "order_cancel_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.cancel",
              detail: safeDetail
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
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
              detail: `query=${lookup.query};total=${lookup.total}`
            });

            clearPending(msg.chat_id);
            return [formatOrderLookupReply(lookup)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            deps.onTrace?.({
              event: "order_lookup_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "order.lookup",
              intent_source: "fallback",
              detail: safeDetail
            });

            clearPending(msg.chat_id);
            return ["No pude consultar ese pedido en este momento. Intenta de nuevo en unos minutos."];
          }
        }

        if (st.pending.action.intent === "order.cancel") {
          const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
          const reference = isObjectRecord(payload.reference) ? { ...payload.reference } : {};
          const mergedReference = {
            ...reference,
            ...referenceFromFreeText(msg.text)
          };

          st.pending.action.payload = {
            ...payload,
            reference: mergedReference
          };

          if (!hasOrderReference(mergedReference)) {
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
            return [
              copy.duplicate(register.operation.operation_id, register.operation.status)
            ];
          }

          return [copy.summary("order.cancel", st.pending.action.payload, st.pending.operation_id)];
        }

        if (st.pending.action.intent === "payment.record") {
          const payload = isObjectRecord(st.pending.action.payload) ? { ...st.pending.action.payload } : {};
          const reference = isObjectRecord(payload.reference) ? { ...payload.reference } : {};
          const payment = isObjectRecord(payload.payment) ? { ...payload.payment } : {};

          const mergedReference = {
            ...reference,
            ...referenceFromFreeText(msg.text)
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

          if (!hasOrderReference(mergedReference)) {
            st.pending.asked = "order_reference";
            st.pending.missing = ["order_reference"];
            setState(msg.chat_id, st);
            return [copy.askFor("order_reference")];
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

        const updatedPayload = mergeField(st.pending.action.payload, st.pending.asked, msg.text);
        st.pending.action.payload = updatedPayload;

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
        const v = validateWith(schema, updatedPayload);

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
            return [
              copy.duplicate(dedupe.duplicate_of.operation_id, dedupe.duplicate_of.status)
            ];
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

        return [copy.askFor(st.pending.asked ?? "unknown")];
      }

      return [copy.pendingOperation(st.pending.operation_id)];
    }

    const paymentRecordDraft = parsePaymentRecordRequest(msg.text);
    if (paymentRecordDraft.matched) {
      if (!paymentRecordDraft.result.ok) {
        if (
          paymentRecordDraft.result.error === "payment_record_reference_missing" ||
          paymentRecordDraft.result.error === "payment_record_estado_pago_missing"
        ) {
          const operation_id = newOperationId();
          const reference = extractOrderReferenceFromText(msg.text);
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

          const askField = hasOrderReference(pendingPayload.reference)
            ? "payment_estado_pago"
            : "order_reference";
          const pending = {
            operation_id,
            idempotency_key: operation_id,
            action: { intent: "payment.record" as const, payload: pendingPayload },
            missing: [askField === "payment_estado_pago" ? "payment.estado_pago" : "order_reference"],
            asked: askField
          };

          setState(msg.chat_id, { pending });
          return [copy.askFor(askField)];
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

    const orderUpdateDraft = parseOrderUpdateRequest(msg.text);
    if (orderUpdateDraft.matched) {
      if (!orderUpdateDraft.result.ok) {
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
      const payload = orderUpdateDraft.result.payload as Record<string, unknown>;
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

    const orderCancelDraft = parseOrderCancelRequest(msg.text);
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

          const pending = {
            operation_id,
            idempotency_key: operation_id,
            action: { intent: "order.cancel" as const, payload: pendingPayload },
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
        return [
          copy.duplicate(register.operation.operation_id, register.operation.status)
        ];
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

    const reportPeriod = detectOrderReportPeriod({
      text: msg.text,
      now: new Date(nowMs()),
      timezone: orderReportTimezone
    });
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
          detail: `period=${report.period.type}:${report.period.label};total=${report.total}`
        });

        return [formatOrderReportReply(report)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);

        deps.onTrace?.({
          event: "order_report_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "reporte",
          intent_source: "fallback",
          detail: safeDetail
        });

        return ["No pude consultar pedidos en este momento. Intenta de nuevo en unos minutos."];
      }
    }

    const lookupQuery = detectOrderLookupQuery(msg.text);
    const lookupNeedsQuery = detectOrderLookupRequestWithoutQuery(msg.text);
    const statusQuery = detectOrderStatusQuery(msg.text);
    const quoteQuery = detectQuoteOrderQuery(msg.text);
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
          detail: `query=${status.query};total=${status.total}`
        });

        return [formatOrderStatusReply(status)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);

        deps.onTrace?.({
          event: "order_status_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.status",
          intent_source: "fallback",
          detail: safeDetail
        });

        return ["No pude consultar el estado de ese pedido en este momento. Intenta de nuevo en unos minutos."];
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
              payload: { query: quoteQuery }
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
              payload: { query: quoteQuery }
            },
            missing: ["quote.shipping"],
            asked: "quote_shipping"
          }
        });
        return ["¿La entrega será para recoger en tienda o envío a domicilio?"];
      }

      try {
        const quote = await executeQuoteOrderFn({
          chat_id: msg.chat_id,
          query: quoteQuery
        });

        deps.onTrace?.({
          event: "quote_order_succeeded",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "quote.order",
          intent_source: "fallback",
          detail: `product=${quote.product.key};total=${quote.total}`
        });

        return [formatQuoteOrderReply(quote)];
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
                payload: { query: quoteQuery }
              },
              missing: ["quote.product"],
              asked: "quote_product"
            }
          });
          return ["No pude identificar el producto base. ¿Qué producto quieres cotizar? Ejemplo: pastel mediano o caja de 12 cupcakes."];
        }

        return ["No pude generar la cotización en este momento. Intenta de nuevo en unos minutos."];
      }
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
          detail: `query=${lookup.query};total=${lookup.total}`
        });

        return [formatOrderLookupReply(lookup)];
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);

        deps.onTrace?.({
          event: "order_lookup_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent: "order.lookup",
          intent_source: "fallback",
          detail: safeDetail
        });

        return ["No pude consultar ese pedido en este momento. Intenta de nuevo en unos minutos."];
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

    const v = validateWith(OrderSchema, parsed.payload);
    const pending = {
      operation_id,
      action: { intent: "pedido" as const, payload: parsed.payload },
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
          action: { intent: "pedido", payload: full },
          missing: [],
          asked: undefined
        }
      });

      return [copy.summary(intent, full, operation_id)];
    }

    return [copy.askFor(pending.asked ?? "unknown")];
  }

  return { handleMessage };
}
