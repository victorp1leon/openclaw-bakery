import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createScheduleWeekViewTool } from "../../src/tools/order/scheduleWeekView";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
const liveMode = process.env.SMOKE_SCHEDULE_WEEK_LIVE === "1";

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_schedule_week_now_invalid");
}

const executeScheduleWeekView = liveMode
  ? createScheduleWeekViewTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    recipeSource: config.orderTool.recipes.source,
    recipesGwsCommand: config.orderTool.recipes.gws.command,
    recipesGwsCommandArgs: config.orderTool.recipes.gws.commandArgs,
    recipesGwsSpreadsheetId: config.orderTool.recipes.gws.spreadsheetId,
    recipesGwsRange: config.orderTool.recipes.gws.range,
    recipesTimeoutMs: config.orderTool.recipes.timeoutMs,
    recipesMaxRetries: config.orderTool.recipes.maxRetries,
    timezone: config.timezone
  })
  : async (args: { chat_id: string; week: { type: "week"; anchorDateKey: string; label: string } }) => {
    const hasOrders = args.week.label.includes("esta semana");
    return {
      week: args.week,
      timezone: config.timezone,
      trace_ref: `schedule-week-view:${args.week.anchorDateKey}:a1`,
      totalOrders: hasOrders ? 2 : 0,
      days: hasOrders
        ? [
          {
            day: {
              type: "day" as const,
              dateKey: args.week.anchorDateKey,
              label: `lunes ${args.week.anchorDateKey}`
            },
            totalOrders: 2,
            deliveries: [
              {
                folio: "op-smoke-week-1",
                operation_id: "op-smoke-week-1",
                fecha_hora_entrega: `${args.week.anchorDateKey} 11:00`,
                nombre_cliente: "Ana",
                producto: "cupcakes",
                cantidad: 12,
                tipo_envio: "recoger_en_tienda",
                estado_pago: "pagado",
                total: 480,
                moneda: "MXN",
                estado_pedido: "activo"
              }
            ],
            preparation: [{ product: "cupcakes", quantity: 12, orders: 2 }],
            suggestedPurchases: [
              {
                item: "harina",
                unit: "g",
                amount: 540,
                sourceProducts: ["cupcakes"],
                source: "catalog" as const
              }
            ],
            inconsistencies: [],
            trace_ref: `schedule-day-view:${args.week.anchorDateKey}:a1`,
            detail: "schedule-day-view mock execution"
          }
        ]
        : [],
      reminders: hasOrders
        ? [
          {
            dateKey: args.week.anchorDateKey,
            label: `lunes ${args.week.anchorDateKey}`,
            totalOrders: 2,
            firstDelivery: `${args.week.anchorDateKey} 11:00`,
            lastDelivery: `${args.week.anchorDateKey} 17:00`
          }
        ]
        : [],
      preparation: hasOrders ? [{ product: "cupcakes", quantity: 12, orders: 2 }] : [],
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
      detail: "schedule-week-view mock execution"
    };
  };

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeScheduleWeekViewFn: executeScheduleWeekView,
  orderReportTimezone: config.timezone
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "schedule_week_view_smoke_start",
        mode: liveMode ? "live" : "mock",
        chatId,
        timezone: config.timezone
      },
      null,
      2
    )
  );

  const scenarios = [
    "dame la agenda de esta semana",
    "dame la agenda semanal de 2026-03-23"
  ];

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Agenda semanal para") || reply.includes("No encontré pedidos para armar la agenda semanal de");

    console.log(
      JSON.stringify(
        {
          event: "schedule_week_view_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`schedule_week_view_smoke_unexpected_reply:${text}`);
    }
  }

  const ask = await processor.handleMessage({
    chat_id: chatId,
    text: "dame la agenda semanal"
  });
  const askOk = (ask[0] ?? "").toLowerCase().includes("semana");
  console.log(
    JSON.stringify(
      {
        event: "schedule_week_view_smoke_missing_week",
        reply: ask[0],
        ok: askOk
      },
      null,
      2
    )
  );
  if (!askOk) {
    throw new Error("schedule_week_view_smoke_missing_week_unexpected_reply");
  }

  const completed = await processor.handleMessage({
    chat_id: chatId,
    text: "2026-03-23"
  });
  const completedOk = (completed[0] ?? "").includes("Agenda semanal para")
    || (completed[0] ?? "").includes("No encontré pedidos para armar la agenda semanal de");
  console.log(
    JSON.stringify(
      {
        event: "schedule_week_view_smoke_missing_week_completed",
        reply: completed[0],
        ok: completedOk
      },
      null,
      2
    )
  );
  if (!completedOk) {
    throw new Error("schedule_week_view_smoke_missing_week_completed_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "schedule_week_view_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "schedule_week_view_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
