import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createLookupOrderTool } from "../../src/tools/order/lookupOrder";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const liveMode = process.env.SMOKE_LOOKUP_LIVE === "1";
const scenarios = [
  "consulta pedido de ana",
  "buscar pedido folio op-xyz-123",
  "consulta pedido de inexistente"
];

const executeOrderLookup = liveMode
  ? createLookupOrderTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    timezone: config.timezone
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
            folio: "op-smoke-lookup-1",
            fecha_hora_entrega: "2026-03-07 14:00",
            nombre_cliente: "Ana",
            producto: "cupcakes",
            cantidad: 12,
            estado_pago: "pagado",
            total: 480,
            moneda: "MXN"
          }
        ],
      detail: "lookup-smoke mock execution"
    };
  };

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  routeIntentFn: async () => "unknown",
  executeOrderLookupFn: executeOrderLookup
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "lookup_smoke_start",
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
    const ok = reply.includes("Pedidos encontrados para ") || reply.includes("No encontré pedidos para ");

    console.log(
      JSON.stringify(
        {
          event: "lookup_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`lookup_smoke_unexpected_reply:${text}`);
    }
  }

  console.log(JSON.stringify({ event: "lookup_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "lookup_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
