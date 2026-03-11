import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createRecordPaymentTool } from "../../src/tools/order/recordPayment";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const liveMode = process.env.SMOKE_PAYMENT_LIVE === "1";
const dryRun = (process.env.SMOKE_PAYMENT_DRY_RUN ?? "1") === "1";
const folio = process.env.SMOKE_PAYMENT_FOLIO?.trim() || "op-smoke-123";
const estadoPago = (process.env.SMOKE_PAYMENT_ESTADO_PAGO?.trim() || "parcial") as "pagado" | "pendiente" | "parcial";
const monto = Number(process.env.SMOKE_PAYMENT_MONTO ?? "100");
const metodo = (process.env.SMOKE_PAYMENT_METODO?.trim() || "transferencia") as "efectivo" | "transferencia" | "tarjeta" | "otro";
const notas = process.env.SMOKE_PAYMENT_NOTAS?.trim() || "smoke payment";

const executePaymentRecord = liveMode
  ? createRecordPaymentTool({
    dryRunDefault: dryRun,
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    gwsRange: config.orderTool.sheets.gws.range,
    gwsValueInputOption: config.orderTool.sheets.gws.valueInputOption,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries
  })
  : async (args: {
    operation_id: string;
    chat_id: string;
    reference: { folio?: string; operation_id_ref?: string };
    payment: {
      estado_pago: "pagado" | "pendiente" | "parcial";
      monto?: number;
      metodo?: "efectivo" | "transferencia" | "tarjeta" | "otro";
      notas?: string;
    };
  }) => ({
    ok: true,
    dry_run: true,
    operation_id: args.operation_id,
    payload: {
      reference: args.reference,
      matched_row_index: 2,
      before: {
        estado_pago: "pendiente"
      },
      after: {
        estado_pago: args.payment.estado_pago
      },
      payment_event: `[PAGO] op:${args.operation_id} estado:${args.payment.estado_pago} monto:${args.payment.monto ?? "n/a"} metodo:${args.payment.metodo ?? "n/a"} nota:${args.payment.notas ?? "n/a"}`,
      already_recorded: false
    },
    detail: "payment-smoke mock execution"
  });

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  routeIntentFn: async () => "unknown",
  executePaymentRecordFn: executePaymentRecord
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "payment_smoke_start",
        mode: liveMode ? "live" : "mock",
        dryRun,
        chatId,
        folio,
        estadoPago,
        monto,
        metodo
      },
      null,
      2
    )
  );

  const paymentJson = JSON.stringify({
    payment: {
      estado_pago: estadoPago,
      monto,
      metodo,
      notas
    }
  });
  const summary = await processor.handleMessage({
    chat_id: chatId,
    text: `registra pago del pedido folio ${folio} ${paymentJson}`
  });
  const summaryOk = (summary[0] ?? "").includes("Resumen") && (summary[0] ?? "").includes("payment.record");
  console.log(
    JSON.stringify(
      {
        event: "payment_smoke_summary",
        reply: summary[0],
        ok: summaryOk
      },
      null,
      2
    )
  );
  if (!summaryOk) {
    throw new Error("payment_smoke_summary_unexpected_reply");
  }

  const executed = await processor.handleMessage({ chat_id: chatId, text: "confirmar" });
  const executedOk = (executed[0] ?? "").includes("Ejecutado");
  console.log(
    JSON.stringify(
      {
        event: "payment_smoke_confirm",
        reply: executed[0],
        ok: executedOk
      },
      null,
      2
    )
  );
  if (!executedOk) {
    throw new Error("payment_smoke_confirm_unexpected_reply");
  }

  const parseFail = await processor.handleMessage({
    chat_id: chatId,
    text: `registra pago del pedido folio ${folio} {"payment":{"monto":100}}`
  });
  const parseFailOk = (parseFail[0] ?? "").toLowerCase().includes("estado de pago");
  console.log(
    JSON.stringify(
      {
        event: "payment_smoke_parse_fail",
        reply: parseFail[0],
        ok: parseFailOk
      },
      null,
      2
    )
  );
  if (!parseFailOk) {
    throw new Error("payment_smoke_parse_fail_unexpected_reply");
  }

  const cleanup = await processor.handleMessage({ chat_id: chatId, text: "cancelar" });
  const cleanupOk = (cleanup[0] ?? "").toLowerCase().includes("cancel");
  console.log(
    JSON.stringify(
      {
        event: "payment_smoke_parse_cleanup",
        reply: cleanup[0],
        ok: cleanupOk
      },
      null,
      2
    )
  );
  if (!cleanupOk) {
    throw new Error("payment_smoke_parse_cleanup_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "payment_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "payment_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
