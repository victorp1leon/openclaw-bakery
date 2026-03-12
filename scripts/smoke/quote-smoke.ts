import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";
import { createQuoteOrderTool, type QuoteOrderResult } from "../../src/tools/order/quoteOrder";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const liveMode = process.env.SMOKE_QUOTE_LIVE === "1";

function parseQty(query: string): number {
  const normalized = query.toLowerCase();
  const raw = normalized.match(/\bx\s*(\d{1,3})\b/)?.[1] ?? normalized.match(/^(\d{1,3})$/)?.[1];
  if (!raw) return 1;
  const qty = Number(raw);
  if (!Number.isInteger(qty) || qty <= 0) return 1;
  return qty;
}

const executeQuoteOrder = liveMode
  ? createQuoteOrderTool({
    gwsCommand: config.orderTool.sheets.gws.command,
    gwsCommandArgs: config.orderTool.sheets.gws.commandArgs,
    gwsSpreadsheetId: config.orderTool.sheets.gws.spreadsheetId,
    timeoutMs: config.orderTool.sheets.timeoutMs,
    maxRetries: config.orderTool.sheets.maxRetries
  })
  : async (args: { chat_id: string; query: string }): Promise<QuoteOrderResult> => {
    const normalized = args.query.toLowerCase();
    const qty = parseQty(args.query);

    const hasCupcake = normalized.includes("cupcake");
    const hasPastel = normalized.includes("pastel");

    if (!hasCupcake && !hasPastel) {
      throw new Error("quote_order_product_not_found");
    }

    if (hasCupcake) {
      const total = qty * 45;
      return {
        query: args.query,
        currency: "MXN",
        quantity: qty,
        shippingMode: "recoger_en_tienda",
        product: {
          key: "cupcake_pieza",
          name: "Cupcake clasico",
          unitAmount: 45
        },
        lines: [{ kind: "base", key: "cupcake_pieza", label: "Cupcake clasico", amount: total }],
        subtotal: total,
        total,
        assumptions: [],
        optionSuggestions: {
          quote_sabor_pan: ["Vainilla", "Chocolate"],
          quote_sabor_relleno: ["Oreo", "Cajeta"],
          quote_tipo_betun: ["Buttercream", "Chantilly"],
          quote_topping: ["Chispas", "Fresas"]
        },
        detail: "quote-smoke mock execution"
      };
    }

    const base = qty * 650;
    return {
      query: args.query,
      currency: "MXN",
      quantity: qty,
      shippingMode: "recoger_en_tienda",
      product: {
        key: "pastel_mediano",
        name: "Pastel mediano",
        unitAmount: 650
      },
      lines: [{ kind: "base", key: "pastel_mediano", label: "Pastel mediano", amount: base }],
      subtotal: base,
      total: base,
      suggestedDeposit: Math.round(base * 0.5),
      quoteValidityHours: 72,
      assumptions: [],
      optionSuggestions: {
        quote_sabor_pan: ["Vainilla", "Chocolate"],
        quote_sabor_relleno: ["Oreo", "Cajeta"],
        quote_tipo_betun: ["Buttercream", "Chantilly"],
        quote_topping: ["Chispas", "Fresas"]
      },
      detail: "quote-smoke mock execution"
    };
  };

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  routeIntentFn: async () => "unknown",
  executeQuoteOrderFn: executeQuoteOrder
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "quote_smoke_start",
        mode: liveMode ? "live" : "mock",
        chatId
      },
      null,
      2
    )
  );

  const direct = await processor.handleMessage({
    chat_id: chatId,
    text: "dame una cotizacion de un pastel mediano x1 recoger en tienda sabor de pan vainilla relleno oreo betun buttercream topping fresas"
  });
  const directOk = (direct[0] ?? "").includes("Cotizacion estimada");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "direct", reply: direct[0], ok: directOk }, null, 2));
  if (!directOk) throw new Error("quote_smoke_direct_unexpected_reply");

  const askQty = await processor.handleMessage({
    chat_id: chatId,
    text: "hazme una cotizacion de cupcakes"
  });
  const askQtyOk = (askQty[0] ?? "").toLowerCase().includes("piezas/porciones");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "missing_quantity", reply: askQty[0], ok: askQtyOk }, null, 2));
  if (!askQtyOk) throw new Error("quote_smoke_missing_quantity_unexpected_reply");

  const askShipping = await processor.handleMessage({
    chat_id: chatId,
    text: "12"
  });
  const askShippingOk = (askShipping[0] ?? "").toLowerCase().includes("recoger en tienda");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "missing_shipping", reply: askShipping[0], ok: askShippingOk }, null, 2));
  if (!askShippingOk) throw new Error("quote_smoke_missing_shipping_unexpected_reply");

  const completed = await processor.handleMessage({
    chat_id: chatId,
    text: "recoger en tienda"
  });
  const askPanOk = (completed[0] ?? "").toLowerCase().includes("sabor");
  const askPanOptionsOk = (completed[0] ?? "").toLowerCase().includes("opciones");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "guided_quote_ask_pan", reply: completed[0], ok: askPanOk }, null, 2));
  if (!askPanOk) throw new Error("quote_smoke_guided_ask_pan_unexpected_reply");
  if (!askPanOptionsOk) throw new Error("quote_smoke_guided_ask_pan_missing_options");

  const askRelleno = await processor.handleMessage({
    chat_id: chatId,
    text: "vainilla"
  });
  const askRellenoOk = (askRelleno[0] ?? "").toLowerCase().includes("relleno");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "guided_quote_ask_relleno", reply: askRelleno[0], ok: askRellenoOk }, null, 2));
  if (!askRellenoOk) throw new Error("quote_smoke_guided_ask_relleno_unexpected_reply");

  const askBetun = await processor.handleMessage({
    chat_id: chatId,
    text: "oreo"
  });
  const askBetunOk = (askBetun[0] ?? "").toLowerCase().includes("bet");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "guided_quote_ask_betun", reply: askBetun[0], ok: askBetunOk }, null, 2));
  if (!askBetunOk) throw new Error("quote_smoke_guided_ask_betun_unexpected_reply");

  const askTopping = await processor.handleMessage({
    chat_id: chatId,
    text: "buttercream"
  });
  const askToppingOk = (askTopping[0] ?? "").toLowerCase().includes("topping");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "guided_quote_ask_topping", reply: askTopping[0], ok: askToppingOk }, null, 2));
  if (!askToppingOk) throw new Error("quote_smoke_guided_ask_topping_unexpected_reply");

  const completedFinal = await processor.handleMessage({
    chat_id: chatId,
    text: "chispas"
  });
  const completedOk = (completedFinal[0] ?? "").includes("Cotizacion estimada");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "guided_quote_completed", reply: completedFinal[0], ok: completedOk }, null, 2));
  if (!completedOk) throw new Error("quote_smoke_guided_completed_unexpected_reply");

  const askProduct = await processor.handleMessage({
    chat_id: chatId,
    text: "dame una cotizacion de algo especial x2 recoger en tienda"
  });
  const askProductOk = (askProduct[0] ?? "").toLowerCase().includes("producto");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "missing_product", reply: askProduct[0], ok: askProductOk }, null, 2));
  if (!askProductOk) throw new Error("quote_smoke_missing_product_unexpected_reply");

  const resolvedProduct = await processor.handleMessage({
    chat_id: chatId,
    text: "pastel mediano sabor de pan vainilla relleno oreo betun buttercream topping fresas"
  });
  const resolvedProductOk = (resolvedProduct[0] ?? "").includes("Cotizacion estimada");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "missing_product_resolved", reply: resolvedProduct[0], ok: resolvedProductOk }, null, 2));
  if (!resolvedProductOk) throw new Error("quote_smoke_missing_product_resolved_unexpected_reply");

  const askQty2 = await processor.handleMessage({
    chat_id: chatId,
    text: "cotiza cupcakes"
  });
  const askQty2Ok = (askQty2[0] ?? "").toLowerCase().includes("piezas/porciones");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "cancel_pending_start", reply: askQty2[0], ok: askQty2Ok }, null, 2));
  if (!askQty2Ok) throw new Error("quote_smoke_cancel_pending_start_unexpected_reply");

  const cancelPending = await processor.handleMessage({
    chat_id: chatId,
    text: "cancelar"
  });
  const cancelPendingOk = (cancelPending[0] ?? "").toLowerCase().includes("cancelada");
  console.log(JSON.stringify({ event: "quote_smoke_case", input: "cancel_pending_end", reply: cancelPending[0], ok: cancelPendingOk }, null, 2));
  if (!cancelPendingOk) throw new Error("quote_smoke_cancel_pending_end_unexpected_reply");

  console.log(JSON.stringify({ event: "quote_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "quote_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
