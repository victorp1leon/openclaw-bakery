import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createScheduleDayViewTool } from "../../src/tools/order/scheduleDayView";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
const liveMode = process.env.SMOKE_SCHEDULE_LIVE === "1";

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_schedule_now_invalid");
}

const executeScheduleDayView = liveMode
  ? createScheduleDayViewTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    timezone: config.timezone
  })
  : async (args: { chat_id: string; day: { type: "day"; dateKey: string; label: string } }) => {
    const hasOrders = args.day.label === "hoy";
    return {
      day: args.day,
      timezone: config.timezone,
      trace_ref: `schedule-day-view:${args.day.dateKey}:a1`,
      totalOrders: hasOrders ? 1 : 0,
      deliveries: hasOrders
        ? [
          {
            folio: "op-smoke-schedule-1",
            operation_id: "op-smoke-schedule-1",
            fecha_hora_entrega: "2026-03-07 14:00",
            nombre_cliente: "Ana",
            producto: "cupcakes",
            cantidad: 12,
            tipo_envio: "recoger_en_tienda",
            estado_pago: "pagado",
            total: 480,
            moneda: "MXN",
            estado_pedido: "activo"
          }
        ]
        : [],
      preparation: hasOrders ? [{ product: "cupcakes", quantity: 12, orders: 1 }] : [],
      suggestedPurchases: hasOrders
        ? [
          {
            item: "harina",
            unit: "g",
            amount: 540,
            sourceProducts: ["cupcakes"],
            source: "catalog" as const
          }
        ]
        : [],
      inconsistencies: [],
      assumptions: [],
      detail: "schedule-day-view mock execution"
    };
  };

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeScheduleDayViewFn: executeScheduleDayView,
  orderReportTimezone: config.timezone
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "schedule_day_view_smoke_start",
        mode: liveMode ? "live" : "mock",
        chatId,
        timezone: config.timezone
      },
      null,
      2
    )
  );

  const scenarios = [
    "dame la agenda de hoy",
    "dame la agenda de manana",
    "dame la agenda del 28 de abril"
  ];

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Agenda del día para") || reply.includes("No encontré pedidos para armar la agenda de");

    console.log(
      JSON.stringify(
        {
          event: "schedule_day_view_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`schedule_day_view_smoke_unexpected_reply:${text}`);
    }
  }

  const ask = await processor.handleMessage({
    chat_id: chatId,
    text: "dame la agenda"
  });
  const askOk = (ask[0] ?? "").toLowerCase().includes("dia") || (ask[0] ?? "").toLowerCase().includes("día");
  console.log(
    JSON.stringify(
      {
        event: "schedule_day_view_smoke_missing_day",
        reply: ask[0],
        ok: askOk
      },
      null,
      2
    )
  );
  if (!askOk) {
    throw new Error("schedule_day_view_smoke_missing_day_unexpected_reply");
  }

  const completed = await processor.handleMessage({
    chat_id: chatId,
    text: "hoy"
  });
  const completedOk = (completed[0] ?? "").includes("Agenda del día para") || (completed[0] ?? "").includes("No encontré pedidos para armar la agenda de");
  console.log(
    JSON.stringify(
      {
        event: "schedule_day_view_smoke_missing_day_completed",
        reply: completed[0],
        ok: completedOk
      },
      null,
      2
    )
  );
  if (!completedOk) {
    throw new Error("schedule_day_view_smoke_missing_day_completed_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "schedule_day_view_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "schedule_day_view_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
