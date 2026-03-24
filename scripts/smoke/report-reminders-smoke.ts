import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createReportRemindersTool } from "../../src/tools/order/reportReminders";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
const liveMode = process.env.SMOKE_REMINDERS_LIVE === "1";

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_reminders_now_invalid");
}

const executeReportReminders = liveMode
  ? createReportRemindersTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    timezone: config.timezone,
    limit: config.orderTool.report.limit
  })
  : async (args: {
    chat_id: string;
    period:
      | { type: "day"; dateKey: string; label: string }
      | { type: "week"; anchorDateKey: string; label: string }
      | { type: "month"; year: number; month: number; label: string }
      | { type: "year"; year: number; label: string }
      | "today"
      | "tomorrow"
      | "week";
  }) => {
    const period = typeof args.period === "string"
      ? args.period === "today"
        ? { type: "day" as const, dateKey: "2026-03-24", label: "hoy" }
        : args.period === "tomorrow"
          ? { type: "day" as const, dateKey: "2026-03-25", label: "mañana" }
          : { type: "week" as const, anchorDateKey: "2026-03-24", label: "esta semana" }
      : args.period;

    return {
      period,
      timezone: config.timezone,
      generated_at: "2026-03-24T12:00:00.000Z",
      total: period.label === "hoy" ? 1 : 0,
      reminders: period.label === "hoy"
        ? [
          {
            folio: "op-smoke-rem-1",
            fecha_hora_entrega: "2026-03-24 14:00",
            nombre_cliente: "Ana",
            producto: "cupcakes",
            cantidad: 12,
            reminder_status: "due_soon" as const,
            minutes_to_delivery: 120
          }
        ]
        : [],
      inconsistencies: [],
      trace_ref: "report-reminders:smoke:a0",
      detail: "report-reminders smoke mock execution"
    };
  };

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeReportRemindersFn: executeReportReminders,
  orderReportTimezone: config.timezone
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "report_reminders_smoke_start",
        mode: liveMode ? "live" : "mock",
        chatId,
        timezone: config.timezone
      },
      null,
      2
    )
  );

  const scenarios = [
    "recordatorios de hoy",
    "recordatorios de esta semana"
  ];

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Recordatorios para ") || reply.includes("No encontré recordatorios para ");

    console.log(
      JSON.stringify(
        {
          event: "report_reminders_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`report_reminders_smoke_unexpected_reply:${text}`);
    }
  }

  const ask = await processor.handleMessage({
    chat_id: chatId,
    text: "recordatorios de pedidos"
  });
  const askOk = (ask[0] ?? "").toLowerCase().includes("periodo");
  console.log(
    JSON.stringify(
      {
        event: "report_reminders_smoke_missing_period",
        reply: ask[0],
        ok: askOk
      },
      null,
      2
    )
  );
  if (!askOk) {
    throw new Error("report_reminders_smoke_missing_period_unexpected_reply");
  }

  const completed = await processor.handleMessage({
    chat_id: chatId,
    text: "hoy"
  });
  const completedOk = (completed[0] ?? "").includes("Recordatorios para") || (completed[0] ?? "").includes("No encontré recordatorios para");
  console.log(
    JSON.stringify(
      {
        event: "report_reminders_smoke_missing_period_completed",
        reply: completed[0],
        ok: completedOk
      },
      null,
      2
    )
  );
  if (!completedOk) {
    throw new Error("report_reminders_smoke_missing_period_completed_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "report_reminders_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "report_reminders_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
