import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createReportOrdersTool } from "../../src/tools/order/reportOrders";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
const liveMode = process.env.SMOKE_REPORT_LIVE === "1";

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_report_now_invalid");
}

const scenarios = [
  "que pedidos tengo hoy",
  "que pedidos tengo mañana",
  "que pedidos tengo el 28 de abril",
  "que pedidos tengo la siguiente semana",
  "que pedidos tengo este mes",
  "que pedidos tengo el mes de mayo"
];

const executeOrderReport = liveMode
  ? createReportOrdersTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    timezone: config.timezone
  })
  : async (args: {
    chat_id: string;
    period: { type: "day"; dateKey: string; label: string }
      | { type: "week"; anchorDateKey: string; label: string }
      | { type: "month"; year: number; month: number; label: string };
  }) => ({
    period: args.period,
    timezone: config.timezone,
    total: 0,
    orders: [],
    detail: "report-smoke mock execution"
  });

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeOrderReportFn: executeOrderReport,
  orderReportTimezone: config.timezone
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "report_smoke_start",
        mode: liveMode ? "live" : "mock",
        chatId,
        timezone: config.timezone,
        scenarios
      },
      null,
      2
    )
  );

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Pedidos para ") || reply.includes("No encontré pedidos para ");

    console.log(
      JSON.stringify(
        {
          event: "report_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`report_smoke_unexpected_reply:${text}`);
    }
  }

  console.log(JSON.stringify({ event: "report_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "report_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
