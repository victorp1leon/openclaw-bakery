import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createOrderStatusTool } from "../../src/tools/order/orderStatus";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
const liveMode = process.env.SMOKE_STATUS_LIVE === "1";
const scenarios = [
  "cual es el estado del pedido folio op-xyz-123",
  "dime el estado del pedido de ana",
  "estado del pedido de inexistente"
];

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_status_now_invalid");
}

const executeOrderStatus = liveMode
  ? createOrderStatusTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    timezone: config.timezone,
    now: () => new Date(nowMs)
  })
  : async (args: { chat_id: string; query: string }) => {
    const noMatch = args.query.includes("inexistente");
    return {
      query: args.query,
      timezone: config.timezone,
      total: noMatch ? 0 : 1,
      orders: noMatch
        ? []
        : [
          {
            folio: "op-smoke-status-1",
            fecha_hora_entrega: "2026-03-10 14:00",
            nombre_cliente: "Ana",
            producto: "pastel",
            estado_pago: "pendiente",
            estado_operativo: "programado" as const,
            total: 900,
            moneda: "MXN"
          }
        ],
      trace_ref: `order-status:${args.query.replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase() || "query"}:a0`,
      detail: "status-smoke mock execution"
    };
  };

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeOrderStatusFn: executeOrderStatus
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "status_smoke_start",
        mode: liveMode ? "live" : "mock",
        chatId,
        scenarios
      },
      null,
      2
    )
  );

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok =
      (reply.includes("Estado de pedidos para ") || reply.includes("No encontré el estado para ")) &&
      reply.includes("Ref: ");

    console.log(
      JSON.stringify(
        {
          event: "status_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`status_smoke_unexpected_reply:${text}`);
    }
  }

  console.log(JSON.stringify({ event: "status_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "status_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
