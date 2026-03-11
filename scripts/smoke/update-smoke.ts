import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createOrderCardSyncTool } from "../../src/tools/order/orderCardSync";
import { createUpdateOrderTool } from "../../src/tools/order/updateOrder";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const liveMode = process.env.SMOKE_UPDATE_LIVE === "1";
const dryRun = (process.env.SMOKE_UPDATE_DRY_RUN ?? "1") === "1";
const folio = process.env.SMOKE_UPDATE_FOLIO?.trim() || "op-smoke-123";

const executeOrderUpdate = liveMode
  ? createUpdateOrderTool({
    dryRunDefault: dryRun,
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries,
    timezone: config.timezone
  })
  : async (args: {
    operation_id: string;
    chat_id: string;
    reference: { folio?: string; operation_id_ref?: string };
    patch: unknown;
  }) => ({
    ok: true,
    dry_run: true,
    operation_id: args.operation_id,
    payload: {
      reference: args.reference,
      patch: args.patch as Record<string, unknown>,
      matched_row_index: 2,
      updated_fields: ["cantidad", "notas"]
    },
    detail: "update-smoke mock execution"
  });

const orderCardSync = liveMode
  ? createOrderCardSyncTool({
    apiKey: config.orderTool.trello.apiKey,
    token: config.orderTool.trello.token,
    apiBaseUrl: config.orderTool.trello.apiBaseUrl,
    cancelListId: config.orderTool.trello.cancelListId,
    timeoutMs: config.orderTool.trello.timeoutMs,
    maxRetries: config.orderTool.trello.maxRetries,
    dryRunDefault: dryRun,
    timezone: config.timezone
  })
  : undefined;

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  routeIntentFn: async () => "unknown",
  executeOrderUpdateFn: executeOrderUpdate,
  orderCardSync
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "update_smoke_start",
        mode: liveMode ? "live" : "mock",
        dryRun,
        chatId,
        folio
      },
      null,
      2
    )
  );

  const summary = await processor.handleMessage({
    chat_id: chatId,
    text: `actualiza pedido folio ${folio} {"patch":{"cantidad":10}}`
  });
  const summaryOk = (summary[0] ?? "").includes("Resumen") && (summary[0] ?? "").includes("order.update");
  console.log(
    JSON.stringify(
      {
        event: "update_smoke_summary",
        reply: summary[0],
        ok: summaryOk
      },
      null,
      2
    )
  );
  if (!summaryOk) {
    throw new Error("update_smoke_summary_unexpected_reply");
  }

  const executed = await processor.handleMessage({ chat_id: chatId, text: "confirmar" });
  const executedOk = (executed[0] ?? "").includes("Ejecutado");
  console.log(
    JSON.stringify(
      {
        event: "update_smoke_confirm",
        reply: executed[0],
        ok: executedOk
      },
      null,
      2
    )
  );
  if (!executedOk) {
    throw new Error("update_smoke_confirm_unexpected_reply");
  }

  const parseFail = await processor.handleMessage({
    chat_id: chatId,
    text: `actualiza pedido folio ${folio}`
  });
  const parseFailOk = (parseFail[0] ?? "").includes("order_update_patch_missing");
  console.log(
    JSON.stringify(
      {
        event: "update_smoke_parse_fail",
        reply: parseFail[0],
        ok: parseFailOk
      },
      null,
      2
    )
  );
  if (!parseFailOk) {
    throw new Error("update_smoke_parse_fail_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "update_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "update_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
