import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createAppendExpenseTool } from "../../src/tools/expense/appendExpense";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const operationId = process.env.SMOKE_OPERATION_ID?.trim() || `smoke-expense-${Date.now()}`;
const monto = Number(process.env.SMOKE_MONTO ?? "123.45");
const concepto = process.env.SMOKE_CONCEPTO?.trim() || "smoke test expense";

if (!Number.isFinite(monto) || monto <= 0) {
  throw new Error("smoke_invalid_monto");
}

const executeExpense = createAppendExpenseTool({
  timeoutMs: config.expenseTool.timeoutMs,
  maxRetries: config.expenseTool.maxRetries,
  dryRunDefault: config.expenseTool.dryRun,
  gwsCommand: config.expenseTool.gws.command,
  gwsCommandArgs: config.expenseTool.gws.commandArgs,
  gwsSpreadsheetId: config.expenseTool.gws.spreadsheetId,
  gwsRange: config.expenseTool.gws.range,
  gwsValueInputOption: config.expenseTool.gws.valueInputOption
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "expense_smoke_start",
        dryRun: config.expenseTool.dryRun,
        provider: config.expenseTool.sheetsProvider,
        gwsCommand: config.expenseTool.gws.command,
        gwsCommandArgs: config.expenseTool.gws.commandArgs,
        gwsSpreadsheetIdConfigured: Boolean(config.expenseTool.gws.spreadsheetId),
        gwsRangeConfigured: Boolean(config.expenseTool.gws.range),
        gwsValueInputOption: config.expenseTool.gws.valueInputOption,
        timeoutMs: config.expenseTool.timeoutMs,
        maxRetries: config.expenseTool.maxRetries,
        chatId,
        operationId
      },
      null,
      2
    )
  );

  const result = await executeExpense({
    operation_id: operationId,
    chat_id: chatId,
    payload: {
      monto,
      concepto,
      moneda: config.defaultCurrency,
      categoria: "otros",
      metodo_pago: "transferencia",
      proveedor: "smoke",
      fecha: new Date().toISOString(),
      notas: "phase2-smoke"
    }
  });

  console.log(
    JSON.stringify(
      {
        event: "expense_smoke_result",
        ok: result.ok,
        dryRun: result.dry_run,
        operationId: result.operation_id,
        detail: result.detail
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "expense_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
