import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createInventoryConsumeTool } from "../../src/tools/order/inventoryConsume";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const liveMode = process.env.SMOKE_INVENTORY_LIVE === "1";
const dryRun = (process.env.SMOKE_INVENTORY_DRY_RUN ?? "1") === "1";
const folio = process.env.SMOKE_INVENTORY_FOLIO?.trim() || "op-smoke-123";

const executeInventoryConsume = liveMode
  ? createInventoryConsumeTool({
    dryRunDefault: dryRun,
    allowNegativeStock: config.inventoryConsume.allowNegativeStock,
    recipeSource: config.inventoryConsume.recipeSource,
    gwsCommand: config.inventoryConsume.gws.command,
    gwsCommandArgs: config.inventoryConsume.gws.commandArgs,
    gwsSpreadsheetId: config.inventoryConsume.gws.spreadsheetId,
    ordersGwsRange: config.inventoryConsume.gws.ordersRange,
    inventoryGwsRange: config.inventoryConsume.gws.inventoryRange,
    movementsGwsRange: config.inventoryConsume.gws.movementsRange,
    recipesGwsRange: config.inventoryConsume.gws.recipesRange,
    gwsValueInputOption: config.inventoryConsume.gws.valueInputOption,
    timeoutMs: config.inventoryConsume.timeoutMs,
    maxRetries: config.inventoryConsume.maxRetries
  })
  : async (args: {
    operation_id: string;
    chat_id: string;
    reference: { folio?: string; operation_id_ref?: string };
  }) => ({
    ok: true,
    dry_run: true,
    operation_id: args.operation_id,
    payload: {
      reference: args.reference,
      order_row_index: 2,
      consumed: [
        {
          insumo: "Harina",
          unidad: "g",
          delta_cantidad: -250,
          stock_antes: 1500,
          stock_despues: 1250
        }
      ],
      movements_written: 1,
      idempotent_replay: false,
      detail: "inventory-smoke mock execution"
    },
    detail: "inventory-smoke mock execution"
  });

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  routeIntentFn: async () => "unknown",
  executeInventoryConsumeFn: executeInventoryConsume,
  inventoryConsumeEnabled: true
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "inventory_smoke_start",
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
    text: `consume inventario del pedido folio ${folio}`
  });
  const summaryOk = (summary[0] ?? "").includes("Resumen") && (summary[0] ?? "").includes("inventory.consume");
  console.log(
    JSON.stringify(
      {
        event: "inventory_smoke_summary",
        reply: summary[0],
        ok: summaryOk
      },
      null,
      2
    )
  );
  if (!summaryOk) {
    throw new Error("inventory_smoke_summary_unexpected_reply");
  }

  const executed = await processor.handleMessage({ chat_id: chatId, text: "confirmar" });
  const executedOk = (executed[0] ?? "").includes("Ejecutado");
  console.log(
    JSON.stringify(
      {
        event: "inventory_smoke_confirm",
        reply: executed[0],
        ok: executedOk
      },
      null,
      2
    )
  );
  if (!executedOk) {
    throw new Error("inventory_smoke_confirm_unexpected_reply");
  }

  const askReference = await processor.handleMessage({
    chat_id: chatId,
    text: "consume inventario del pedido"
  });
  const askReferenceOk = (askReference[0] ?? "").toLowerCase().includes("folio");
  console.log(
    JSON.stringify(
      {
        event: "inventory_smoke_missing_reference",
        reply: askReference[0],
        ok: askReferenceOk
      },
      null,
      2
    )
  );
  if (!askReferenceOk) {
    throw new Error("inventory_smoke_missing_reference_unexpected_reply");
  }

  const cleanup = await processor.handleMessage({ chat_id: chatId, text: "cancelar" });
  const cleanupOk = (cleanup[0] ?? "").toLowerCase().includes("cancel");
  console.log(
    JSON.stringify(
      {
        event: "inventory_smoke_cleanup",
        reply: cleanup[0],
        ok: cleanupOk
      },
      null,
      2
    )
  );
  if (!cleanupOk) {
    throw new Error("inventory_smoke_cleanup_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "inventory_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "inventory_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
