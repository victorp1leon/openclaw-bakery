import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createAppendOrderTool } from "../../src/tools/order/appendOrder";
import { runGwsCommand } from "../../src/tools/googleWorkspace/runGwsCommand";
import { createCancelOrderTool } from "../../src/tools/order/cancelOrder";
import { createCreateCardTool } from "../../src/tools/order/createCard";
import { createOrderCardSyncTool } from "../../src/tools/order/orderCardSync";
import { createUpdateOrderTool } from "../../src/tools/order/updateOrder";

dotenv.config();

const config = loadAppConfig();

const liveMode = process.env.SMOKE_LIFECYCLE_LIVE === "1";
const dryRun = (process.env.SMOKE_LIFECYCLE_DRY_RUN ?? (liveMode ? "0" : "1")) === "1";
const strictCreateSync = process.env.SMOKE_LIFECYCLE_STRICT_CREATE_SYNC === "1";
const traceEnabled = process.env.SMOKE_LIFECYCLE_TRACE === "1";
const chatId = process.env.SMOKE_CHAT_ID?.trim() || process.env.SMOKE_LIFECYCLE_CHAT_ID?.trim() || `smoke-lifecycle-${Date.now()}`;
const customerName = process.env.SMOKE_LIFECYCLE_CUSTOMER?.trim() || "Cliente Lifecycle Smoke";
const product = process.env.SMOKE_LIFECYCLE_PRODUCT?.trim() || "pastel";
const quantity = Number(process.env.SMOKE_LIFECYCLE_QUANTITY ?? "1");
const deliveryAt = process.env.SMOKE_LIFECYCLE_DELIVERY_AT?.trim() || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

if (!Number.isFinite(quantity) || quantity <= 0) {
  throw new Error("smoke_lifecycle_invalid_quantity");
}

const orderPayload = {
  nombre_cliente: customerName,
  producto: product,
  cantidad: Math.trunc(quantity),
  tipo_envio: "recoger_en_tienda" as const,
  fecha_hora_entrega: deliveryAt,
  estado_pago: "pendiente" as const,
  total: 0,
  moneda: config.defaultCurrency,
  notas: "smoke-lifecycle"
};

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

const confirmMaxAttempts = toPositiveInt(process.env.SMOKE_LIFECYCLE_CONFIRM_MAX_ATTEMPTS, 3);
const confirmRetryDelayMs = toPositiveInt(process.env.SMOKE_LIFECYCLE_CONFIRM_RETRY_DELAY_MS, 1000);

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertOrThrow(condition: boolean, detail: string): void {
  if (!condition) throw new Error(detail);
}

type ConversationTraceEvent = {
  event: string;
  chat_id: string;
  strict_mode: boolean;
  intent?: string;
  intent_source?: string;
  parse_source?: string;
  detail?: string;
};

type Phase = "create" | "update" | "cancel";

function isExecutedReply(reply: string): boolean {
  return reply.includes("Ejecutado");
}

function isRetryableOrderFailureReply(reply: string): boolean {
  const normalized = reply.toLowerCase();
  return normalized.includes("no se pudo ejecutar el pedido") && normalized.includes("responde confirmar para reintentar");
}

function extractOperationIdFromFailureReply(reply: string): string | undefined {
  const match = reply.match(/operation_id:\s*([a-f0-9-]{8,})/i);
  return match?.[1];
}

function latestFailureTraceDetail(events: ConversationTraceEvent[], phase: Phase): string | undefined {
  const traceEventName = phase === "create"
    ? "order_execute_failed"
    : phase === "update"
      ? "order_update_execute_failed"
      : "order_cancel_execute_failed";

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.event === traceEventName) {
      return event.detail;
    }
  }
  return undefined;
}

async function confirmPendingWithRetry(args: {
  processor: {
    handleMessage: (message: { chat_id: string; text: string }) => Promise<string[]>;
  };
  chatId: string;
  phase: Phase;
  traceEvents: ConversationTraceEvent[];
}): Promise<{ ok: boolean; reply: string; attempts: number }> {
  let lastReply = "";

  for (let attempt = 1; attempt <= confirmMaxAttempts; attempt += 1) {
    const response = await args.processor.handleMessage({ chat_id: args.chatId, text: "confirmar" });
    const reply = response[0] ?? "";
    lastReply = reply;

    const ok = isExecutedReply(reply);
    const retryableFailure = isRetryableOrderFailureReply(reply);
    const operationId = retryableFailure ? extractOperationIdFromFailureReply(reply) : undefined;
    const traceDetail = !ok ? latestFailureTraceDetail(args.traceEvents, args.phase) : undefined;

    console.log(
      JSON.stringify(
        {
          event: `lifecycle_${args.phase}_confirm_attempt`,
          attempt,
          ok,
          retryableFailure,
          operation_id: operationId,
          trace_detail: traceDetail,
          reply
        },
        null,
        2
      )
    );

    if (ok) {
      return {
        ok: true,
        reply,
        attempts: attempt
      };
    }

    if (!retryableFailure || attempt >= confirmMaxAttempts) {
      return {
        ok: false,
        reply,
        attempts: attempt
      };
    }

    await sleep(confirmRetryDelayMs);
  }

  return {
    ok: false,
    reply: lastReply,
    attempts: confirmMaxAttempts
  };
}

function extractSummaryPayload(reply: string): Record<string, unknown> {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("smoke_lifecycle_summary_json_missing");
  }
  const raw = reply.slice(start, end + 1);
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("smoke_lifecycle_summary_json_invalid");
  }
  return parsed as Record<string, unknown>;
}

function parseRowsFromGwsPayload(value: unknown): string[][] | undefined {
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

function normalizeRangeToU(value: string | undefined): string {
  const range = value?.trim() || "Pedidos!A:U";
  const bang = range.indexOf("!");
  if (bang === -1) return `${range}!A:U`;

  const sheet = range.slice(0, bang).trim() || "Pedidos";
  const a1 = range.slice(bang + 1).trim();
  if (!a1 || !a1.includes(":")) return `${sheet}!A:U`;

  const [startRaw, endRaw] = a1.split(":");
  const start = startRaw?.trim() || "A";
  const end = endRaw?.trim() || "U";
  const endMatch = end.match(/^([A-Za-z]+)(\d+)?$/);
  if (!endMatch) return `${sheet}!${a1}`;

  const endCol = endMatch[1].toUpperCase();
  const endRow = endMatch[2] ?? "";
  const endColNum = endCol.split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
  const minColNum = "U".charCodeAt(0) - 64;
  if (endColNum >= minColNum) return `${sheet}!${a1}`;
  return `${sheet}!${start}:U${endRow}`;
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  return normalized.includes("folio") && normalized.includes("fecha_hora_entrega");
}

async function readSheetRows(): Promise<string[][]> {
  const command = config.orderTool.sheets.gws.command?.trim() || "gws";
  const commandArgs = config.orderTool.sheets.gws.commandArgs ?? [];
  const spreadsheetId = config.orderTool.sheets.gws.spreadsheetId?.trim();
  if (!spreadsheetId) {
    throw new Error("smoke_lifecycle_gws_spreadsheet_id_missing");
  }

  const params = {
    spreadsheetId,
    range: normalizeRangeToU(config.orderTool.sheets.gws.range)
  };
  const result = await runGwsCommand({
    command,
    commandArgs: [
      ...commandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "get",
      "--params",
      JSON.stringify(params)
    ],
    timeoutMs: config.orderTool.sheets.timeoutMs
  });

  if (result.timedOut || result.exitCode !== 0) {
    throw new Error("smoke_lifecycle_gws_read_failed");
  }

  const payload = result.stdout.trim().length > 0 ? JSON.parse(result.stdout) : undefined;
  const rows = parseRowsFromGwsPayload(payload);
  if (!rows) throw new Error("smoke_lifecycle_gws_payload_invalid");
  return rows;
}

async function readOrderRowByFolio(folio: string): Promise<{ row: string[]; hasHeaders: boolean }> {
  const rows = await readSheetRows();
  const hasHeaders = rows.length > 0 && isHeaderRow(rows[0] ?? []);
  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const found = dataRows.find((row) => (row[1] ?? "").trim() === folio);
  if (!found) throw new Error("smoke_lifecycle_sheet_row_not_found");
  return { row: found, hasHeaders };
}

async function fetchTrelloCard(cardId: string): Promise<Record<string, unknown>> {
  const apiKey = config.orderTool.trello.apiKey?.trim();
  const token = config.orderTool.trello.token?.trim();
  if (!apiKey || !token) throw new Error("smoke_lifecycle_trello_credentials_missing");
  const baseUrl = (config.orderTool.trello.apiBaseUrl?.trim() || "https://api.trello.com").replace(/\/+$/, "");

  const params = new URLSearchParams({
    key: apiKey,
    token,
    fields: "id,idList,due,name,desc,url,shortUrl"
  });
  const response = await fetch(`${baseUrl}/1/cards/${encodeURIComponent(cardId)}?${params.toString()}`);
  if (!response.ok) throw new Error(`smoke_lifecycle_trello_card_http_${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

async function fetchTrelloComments(cardId: string): Promise<string[]> {
  const apiKey = config.orderTool.trello.apiKey?.trim();
  const token = config.orderTool.trello.token?.trim();
  if (!apiKey || !token) throw new Error("smoke_lifecycle_trello_credentials_missing");
  const baseUrl = (config.orderTool.trello.apiBaseUrl?.trim() || "https://api.trello.com").replace(/\/+$/, "");

  const params = new URLSearchParams({
    key: apiKey,
    token,
    filter: "commentCard",
    limit: "50",
    fields: "data,date"
  });
  const response = await fetch(`${baseUrl}/1/cards/${encodeURIComponent(cardId)}/actions?${params.toString()}`);
  if (!response.ok) throw new Error(`smoke_lifecycle_trello_actions_http_${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];

  return payload
    .map((action) => {
      const data = action && typeof action === "object" ? (action as { data?: { text?: unknown } }).data : undefined;
      return typeof data?.text === "string" ? data.text : undefined;
    })
    .filter((text): text is string => typeof text === "string");
}

async function findTrelloCardIdByOperationId(operationId: string): Promise<string | undefined> {
  const apiKey = config.orderTool.trello.apiKey?.trim();
  const token = config.orderTool.trello.token?.trim();
  if (!apiKey || !token) throw new Error("smoke_lifecycle_trello_credentials_missing");
  const baseUrl = (config.orderTool.trello.apiBaseUrl?.trim() || "https://api.trello.com").replace(/\/+$/, "");

  const params = new URLSearchParams({
    key: apiKey,
    token,
    query: `[operation_id:${operationId}]`,
    modelTypes: "cards",
    cards_limit: "1",
    card_fields: "id,name,idList"
  });
  const response = await fetch(`${baseUrl}/1/search?${params.toString()}`);
  if (!response.ok) throw new Error(`smoke_lifecycle_trello_search_http_${response.status}`);
  const payload = (await response.json()) as { cards?: Array<{ id?: string }> };
  const card = Array.isArray(payload.cards) ? payload.cards[0] : undefined;
  return typeof card?.id === "string" && card.id.length > 0 ? card.id : undefined;
}

async function waitFor<T>(args: {
  label: string;
  attempts?: number;
  intervalMs?: number;
  execute: () => Promise<T>;
  validate: (value: T) => boolean;
}): Promise<T> {
  const attempts = args.attempts ?? 10;
  const intervalMs = args.intervalMs ?? 1000;
  let lastValue: T | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const value = await args.execute();
      lastValue = value;
      if (args.validate(value)) return value;
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }

  const reason = lastError instanceof Error ? lastError.message : "condition_not_met";
  throw new Error(`${args.label}_timeout:${reason}${lastValue ? " (value_present)" : ""}`);
}

const executeCreateCard = createCreateCardTool({
  apiKey: config.orderTool.trello.apiKey,
  token: config.orderTool.trello.token,
  listId: config.orderTool.trello.listId,
  apiBaseUrl: config.orderTool.trello.apiBaseUrl,
  timeoutMs: config.orderTool.trello.timeoutMs,
  maxRetries: config.orderTool.trello.maxRetries,
  dryRunDefault: dryRun
});

const executeAppendOrder = createAppendOrderTool({
  timeoutMs: config.orderTool.sheets.timeoutMs,
  maxRetries: config.orderTool.sheets.maxRetries,
  dryRunDefault: dryRun,
  gwsCommand: config.orderTool.sheets.gws.command,
  gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
  gwsRange: config.orderTool.sheets.gws.range,
  gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption,
  timezone: config.timezone
});

const executeOrderUpdate = createUpdateOrderTool({
  dryRunDefault: dryRun,
  gwsCommand: config.orderTool.sheets.gws.command,
  gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
  gwsRange: config.orderTool.sheets.gws.range,
  gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption,
  timeoutMs: config.orderTool.sheets.timeoutMs,
  maxRetries: config.orderTool.sheets.maxRetries,
  timezone: config.timezone
});

const executeOrderCancel = createCancelOrderTool({
  dryRunDefault: dryRun,
  gwsCommand: config.orderTool.sheets.gws.command,
  gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
  gwsRange: config.orderTool.sheets.gws.range,
  gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption,
  timeoutMs: config.orderTool.sheets.timeoutMs,
  maxRetries: config.orderTool.sheets.maxRetries
});

const orderCardSync = createOrderCardSyncTool({
  apiKey: config.orderTool.trello.apiKey,
  token: config.orderTool.trello.token,
  apiBaseUrl: config.orderTool.trello.apiBaseUrl,
  listId: config.orderTool.trello.listId,
  cancelListId: config.orderTool.trello.cancelListId,
  timeoutMs: config.orderTool.trello.timeoutMs,
  maxRetries: config.orderTool.trello.maxRetries,
  dryRunDefault: dryRun,
  timezone: config.timezone
});

async function main() {
  const createTrigger = `smoke lifecycle create ${Date.now()}`;
  const traceEvents: ConversationTraceEvent[] = [];

  const processor = createConversationProcessor({
    allowedChatIds: new Set([chatId]),
    routeIntentFn: async (text: string) => (text === createTrigger ? "pedido" : "unknown"),
    parseOrderFn: async (text: string) => {
      if (text === createTrigger) {
        return { ok: true, payload: orderPayload, source: "custom" as const };
      }
      return { ok: false, error: "smoke_lifecycle_parse_not_matched", source: "custom" as const };
    },
    executeCreateCardFn: executeCreateCard,
    executeAppendOrderFn: executeAppendOrder,
    executeOrderUpdateFn: executeOrderUpdate,
    executeOrderCancelFn: executeOrderCancel,
    orderCardSync,
    onTrace: (event) => {
      traceEvents.push(event);
      if (traceEnabled) {
        console.log(JSON.stringify({ event: "lifecycle_trace", trace: event }, null, 2));
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        event: "lifecycle_smoke_start",
        mode: liveMode ? "live" : "mock",
        dryRun,
        strictCreateSync,
        traceEnabled,
        confirmMaxAttempts,
        confirmRetryDelayMs,
        chatId,
        order: {
          customerName,
          product,
          quantity,
          deliveryAt
        },
        trello: {
          apiKeyConfigured: Boolean(config.orderTool.trello.apiKey),
          tokenConfigured: Boolean(config.orderTool.trello.token),
          listIdConfigured: Boolean(config.orderTool.trello.listId),
          cancelListIdConfigured: Boolean(config.orderTool.trello.cancelListId)
        },
        sheets: {
          provider: config.orderTool.sheets.provider,
          spreadsheetConfigured: Boolean(config.orderTool.sheets.gws.spreadsheetId),
          range: normalizeRangeToU(config.orderTool.sheets.gws.range)
        }
      },
      null,
      2
    )
  );

  const createSummary = await processor.handleMessage({ chat_id: chatId, text: createTrigger });
  const createSummaryReply = createSummary[0] ?? "";
  const createSummaryOk = createSummaryReply.includes("Resumen") && createSummaryReply.includes("pedido");
  console.log(JSON.stringify({ event: "lifecycle_create_summary", reply: createSummaryReply, ok: createSummaryOk }, null, 2));
  assertOrThrow(createSummaryOk, "lifecycle_create_summary_unexpected_reply");
  const createSummaryPayload = extractSummaryPayload(createSummaryReply);
  const createOperationId = String(createSummaryPayload.operation_id ?? "");
  assertOrThrow(createOperationId.length > 0, "lifecycle_create_operation_id_missing");

  const createConfirm = await confirmPendingWithRetry({
    processor,
    chatId,
    phase: "create",
    traceEvents
  });
  console.log(
    JSON.stringify(
      {
        event: "lifecycle_create_confirm",
        reply: createConfirm.reply,
        ok: createConfirm.ok,
        attempts: createConfirm.attempts
      },
      null,
      2
    )
  );
  assertOrThrow(createConfirm.ok, "lifecycle_create_confirm_unexpected_reply");

  let trelloCardId = "trello-dry-run-card";

  if (!dryRun) {
    const rowAfterCreate = await waitFor({
      label: "lifecycle_create_row_found",
      execute: async () => readOrderRowByFolio(createOperationId),
      validate: (value) => value.row.length > 0
    });
    const estadoPedidoAfterCreate = (rowAfterCreate.row[19] ?? "").trim().toLowerCase();
    trelloCardId = (rowAfterCreate.row[20] ?? "").trim();

    if (trelloCardId.length === 0) {
      const cardIdFromMarker = await waitFor({
        label: "lifecycle_create_trello_card_lookup",
        execute: async () => findTrelloCardIdByOperationId(createOperationId),
        validate: (value) => typeof value === "string" && value.length > 0
      });
      trelloCardId = cardIdFromMarker ?? "";
    }
    assertOrThrow(trelloCardId.length > 0, "lifecycle_create_trello_card_id_missing");

    if (strictCreateSync) {
      assertOrThrow(estadoPedidoAfterCreate === "activo", "lifecycle_create_estado_pedido_not_activo");
      assertOrThrow((rowAfterCreate.row[20] ?? "").trim().length > 0, "lifecycle_create_trello_card_id_not_persisted");
    }

    const card = await waitFor({
      label: "lifecycle_create_trello_validation",
      execute: async () => fetchTrelloCard(trelloCardId),
      validate: (value) => String(value.idList ?? "") === (config.orderTool.trello.listId ?? "")
    });

    console.log(
      JSON.stringify(
        {
          event: "lifecycle_create_validated",
          folio: createOperationId,
          estado_pedido: rowAfterCreate.row[19],
          trello_card_id: trelloCardId,
          sheet_card_id_persisted: (rowAfterCreate.row[20] ?? "").trim().length > 0,
          trello_list_id: card.idList
        },
        null,
        2
      )
    );
  }

  const updateSummary = await processor.handleMessage({
    chat_id: chatId,
    text: `actualiza pedido folio ${createOperationId} {"patch":{"cantidad":${Math.trunc(quantity) + 1},"notas":"smoke lifecycle update"}}`
  });
  const updateSummaryReply = updateSummary[0] ?? "";
  const updateSummaryOk = updateSummaryReply.includes("Resumen") && updateSummaryReply.includes("order.update");
  console.log(JSON.stringify({ event: "lifecycle_update_summary", reply: updateSummaryReply, ok: updateSummaryOk }, null, 2));
  assertOrThrow(updateSummaryOk, "lifecycle_update_summary_unexpected_reply");
  const updateSummaryPayload = extractSummaryPayload(updateSummaryReply);
  const updateOperationId = String(updateSummaryPayload.operation_id ?? "");
  assertOrThrow(updateOperationId.length > 0, "lifecycle_update_operation_id_missing");

  const updateConfirm = await confirmPendingWithRetry({
    processor,
    chatId,
    phase: "update",
    traceEvents
  });
  console.log(
    JSON.stringify(
      {
        event: "lifecycle_update_confirm",
        reply: updateConfirm.reply,
        ok: updateConfirm.ok,
        attempts: updateConfirm.attempts
      },
      null,
      2
    )
  );
  assertOrThrow(updateConfirm.ok, "lifecycle_update_confirm_unexpected_reply");

  if (!dryRun) {
    const rowAfterUpdate = await waitFor({
      label: "lifecycle_update_sheet_validation",
      execute: async () => readOrderRowByFolio(createOperationId),
      validate: (value) => {
        const row = value.row;
        const updatedQty = Number(row[7] ?? "0");
        const notes = String(row[15] ?? "");
        const cardId = String(row[20] ?? "");
        return updatedQty === Math.trunc(quantity) + 1 && notes.includes("[UPDATE]") && cardId === trelloCardId;
      }
    });

    const comments = await waitFor({
      label: "lifecycle_update_trello_comment",
      execute: async () => fetchTrelloComments(trelloCardId),
      validate: (value) => value.some((text) => text.includes(`[UPDATE] op:${updateOperationId}`))
    });

    console.log(
      JSON.stringify(
        {
          event: "lifecycle_update_validated",
          folio: createOperationId,
          cantidad: rowAfterUpdate.row[7],
          estado_pedido: rowAfterUpdate.row[19],
          trello_card_id: rowAfterUpdate.row[20],
          trello_comment_found: comments.some((text) => text.includes(`[UPDATE] op:${updateOperationId}`))
        },
        null,
        2
      )
    );
  }

  const cancelSummary = await processor.handleMessage({
    chat_id: chatId,
    text: `cancela pedido folio ${createOperationId} {"motivo":"smoke lifecycle cancel"}`
  });
  const cancelSummaryReply = cancelSummary[0] ?? "";
  const cancelSummaryOk = cancelSummaryReply.includes("Resumen") && cancelSummaryReply.includes("order.cancel");
  console.log(JSON.stringify({ event: "lifecycle_cancel_summary", reply: cancelSummaryReply, ok: cancelSummaryOk }, null, 2));
  assertOrThrow(cancelSummaryOk, "lifecycle_cancel_summary_unexpected_reply");
  const cancelSummaryPayload = extractSummaryPayload(cancelSummaryReply);
  const cancelOperationId = String(cancelSummaryPayload.operation_id ?? "");
  assertOrThrow(cancelOperationId.length > 0, "lifecycle_cancel_operation_id_missing");

  const cancelConfirm = await confirmPendingWithRetry({
    processor,
    chatId,
    phase: "cancel",
    traceEvents
  });
  console.log(
    JSON.stringify(
      {
        event: "lifecycle_cancel_confirm",
        reply: cancelConfirm.reply,
        ok: cancelConfirm.ok,
        attempts: cancelConfirm.attempts
      },
      null,
      2
    )
  );
  assertOrThrow(cancelConfirm.ok, "lifecycle_cancel_confirm_unexpected_reply");

  if (!dryRun) {
    const cancelListId = config.orderTool.trello.cancelListId ?? "";
    const rowAfterCancel = await waitFor({
      label: "lifecycle_cancel_sheet_validation",
      execute: async () => readOrderRowByFolio(createOperationId),
      validate: (value) => {
        const row = value.row;
        const notes = String(row[15] ?? "");
        const estadoPedido = String(row[19] ?? "").trim().toLowerCase();
        const cardId = String(row[20] ?? "").trim();
        return notes.includes("[CANCELADO]") && estadoPedido === "cancelado" && cardId === trelloCardId;
      }
    });

    const cardAfterCancel = await waitFor({
      label: "lifecycle_cancel_trello_list_validation",
      execute: async () => fetchTrelloCard(trelloCardId),
      validate: (value) => String(value.idList ?? "") === cancelListId
    });

    const cancelComments = await waitFor({
      label: "lifecycle_cancel_trello_comment",
      execute: async () => fetchTrelloComments(trelloCardId),
      validate: (value) => value.some((text) => text.includes(`[CANCELADO] op:${cancelOperationId}`))
    });

    console.log(
      JSON.stringify(
        {
          event: "lifecycle_cancel_validated",
          folio: createOperationId,
          estado_pedido: rowAfterCancel.row[19],
          trello_card_id: rowAfterCancel.row[20],
          trello_list_id: cardAfterCancel.idList,
          trello_comment_found: cancelComments.some((text) => text.includes(`[CANCELADO] op:${cancelOperationId}`))
        },
        null,
        2
      )
    );
  }

  console.log(
    JSON.stringify(
      {
        event: "lifecycle_smoke_done",
        ok: true,
        mode: liveMode ? "live" : "mock",
        dryRun,
        chatId,
        folio: createOperationId
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "lifecycle_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
