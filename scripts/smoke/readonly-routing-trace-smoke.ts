import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";

dotenv.config();

const config = loadAppConfig();
const chatIdBase = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const chatId = `${chatIdBase}-readonly-trace-${Date.now()}`;

async function main() {
  const traces: Array<Record<string, unknown>> = [];

  const prevReadOnly = process.env.OPENCLAW_READONLY_ROUTING_ENABLE;
  const prevQuote = process.env.OPENCLAW_READONLY_QUOTE_ENABLE;
  const prevStrict = process.env.OPENCLAW_STRICT;

  process.env.OPENCLAW_READONLY_ROUTING_ENABLE = "1";
  process.env.OPENCLAW_READONLY_QUOTE_ENABLE = "1";
  process.env.OPENCLAW_STRICT = "0";

  console.log(
    JSON.stringify(
      {
        event: "readonly_trace_smoke_start",
        mode: "mock",
        chatId
      },
      null,
      2
    )
  );

  try {
    const processor = createConversationProcessor({
      allowedChatIds: new Set([chatId]),
      routeIntentFn: async () => "unknown",
      routeReadOnlyIntentFn: async () => ({
        intent: "order.status",
        source: "openclaw",
        strict_mode: false,
        query: "ana"
      }),
      executeOrderStatusFn: async () => ({
        query: "ana",
        timezone: config.timezone,
        total: 1,
        orders: [
          {
            folio: "op-readonly-trace-1",
            fecha_hora_entrega: "2026-03-20 10:00",
            nombre_cliente: "Ana",
            producto: "pastel",
            estado_pago: "pendiente",
            estado_operativo: "programado" as const,
            total: 450,
            moneda: "MXN",
            operation_id: "op-readonly-trace-1"
          }
        ],
        trace_ref: "order-status:ana:a0",
        detail: "readonly-trace-smoke mock execution"
      }),
      onTrace: (event) => traces.push(event as Record<string, unknown>)
    });

    const replies = await processor.handleMessage({
      chat_id: chatId,
      text: "como va ana?"
    });
    const reply = replies[0] ?? "";
    const readonlyTrace = traces.find((trace) => trace.event === "readonly_intent_routed");

    const ok =
      reply.includes("Ref: order-status:ana:a0") &&
      readonlyTrace != null &&
      readonlyTrace.intent === "order.status" &&
      readonlyTrace.intent_source === "openclaw";

    console.log(
      JSON.stringify(
        {
          event: "readonly_trace_smoke_case",
          input: "como va ana?",
          reply,
          trace_event: readonlyTrace?.event,
          trace_intent: readonlyTrace?.intent,
          trace_source: readonlyTrace?.intent_source,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error("readonly_trace_smoke_expectation_failed");
    }

    console.log(JSON.stringify({ event: "readonly_trace_smoke_done", ok: true }, null, 2));
  } finally {
    if (prevReadOnly == null) delete process.env.OPENCLAW_READONLY_ROUTING_ENABLE;
    else process.env.OPENCLAW_READONLY_ROUTING_ENABLE = prevReadOnly;

    if (prevQuote == null) delete process.env.OPENCLAW_READONLY_QUOTE_ENABLE;
    else process.env.OPENCLAW_READONLY_QUOTE_ENABLE = prevQuote;

    if (prevStrict == null) delete process.env.OPENCLAW_STRICT;
    else process.env.OPENCLAW_STRICT = prevStrict;
  }
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "readonly_trace_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
