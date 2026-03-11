import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createAppendOrderTool } from "../../src/tools/order/appendOrder";
import { createCreateCardTool } from "../../src/tools/order/createCard";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const operationId = process.env.SMOKE_OPERATION_ID?.trim() || `smoke-order-${Date.now()}`;
const customerName = process.env.SMOKE_ORDER_CUSTOMER?.trim() || "Cliente Smoke";
const product = process.env.SMOKE_ORDER_PRODUCT?.trim() || "cupcakes";
const quantity = Number(process.env.SMOKE_ORDER_QUANTITY ?? "12");
const deliveryAt = process.env.SMOKE_ORDER_DELIVERY_AT?.trim() || new Date().toISOString();

if (!Number.isFinite(quantity) || quantity <= 0) {
  throw new Error("smoke_invalid_order_quantity");
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
  notas: "phase3-smoke"
};

const executeCreateCard = createCreateCardTool({
  apiKey: config.orderTool.trello.apiKey,
  token: config.orderTool.trello.token,
  listId: config.orderTool.trello.listId,
  apiBaseUrl: config.orderTool.trello.apiBaseUrl,
  timeoutMs: config.orderTool.trello.timeoutMs,
  maxRetries: config.orderTool.trello.maxRetries,
  dryRunDefault: config.orderTool.trello.dryRun
});

const executeAppendOrder = createAppendOrderTool({
  timeoutMs: config.orderTool.sheets.timeoutMs,
  maxRetries: config.orderTool.sheets.maxRetries,
  dryRunDefault: config.orderTool.sheets.dryRun,
  gwsCommand: config.orderTool.sheets.gws.command,
  gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
  gwsRange: config.orderTool.sheets.gws.range,
  gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "order_smoke_start",
        chatId,
        operationId,
        trello: {
          dryRun: config.orderTool.trello.dryRun,
          apiKeyConfigured: Boolean(config.orderTool.trello.apiKey),
          tokenConfigured: Boolean(config.orderTool.trello.token),
          listIdConfigured: Boolean(config.orderTool.trello.listId),
          apiBaseUrl: config.orderTool.trello.apiBaseUrl,
          timeoutMs: config.orderTool.trello.timeoutMs,
          maxRetries: config.orderTool.trello.maxRetries
        },
        sheets: {
          dryRun: config.orderTool.sheets.dryRun,
          provider: config.orderTool.sheets.provider,
          gwsCommand: config.orderTool.sheets.gws.command,
          gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
          gwsSpreadsheetIdConfigured: Boolean(config.orderTool.sheets.gws.spreadsheetId),
          gwsRangeConfigured: Boolean(config.orderTool.sheets.gws.range),
          gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption,
          timeoutMs: config.orderTool.sheets.timeoutMs,
          maxRetries: config.orderTool.sheets.maxRetries
        }
      },
      null,
      2
    )
  );

  const createResult = await executeCreateCard({
    operation_id: operationId,
    chat_id: chatId,
    payload: orderPayload
  });

  const appendResult = await executeAppendOrder({
    operation_id: operationId,
    chat_id: chatId,
    payload: orderPayload
  });

  console.log(
    JSON.stringify(
      {
        event: "order_smoke_result",
        operationId,
        createCard: {
          ok: createResult.ok,
          dryRun: createResult.dry_run,
          detail: createResult.detail
        },
        appendOrder: {
          ok: appendResult.ok,
          dryRun: appendResult.dry_run,
          detail: appendResult.detail
        }
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "order_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
