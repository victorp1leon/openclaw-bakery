import { describe, expect, it } from "vitest";

import { routeReadOnlyIntentDetailed } from "./readOnlyIntentRouter";

describe("routeReadOnlyIntentDetailed", () => {
  it("enruta order.lookup y extrae query", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "order.lookup",
        query: "ana"
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "busca pedido de ana",
      runtime
    });

    expect(routed.intent).toBe("order.lookup");
    expect(routed.query).toBe("ana");
    expect(routed.source).toBe("openclaw");
  });

  it("mapea report.orders con period=today", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "report.orders",
        period: { kind: "today" }
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "pedidos de hoy",
      runtime
    });

    expect(routed.intent).toBe("report.orders");
    expect(routed.period).toBe("today");
  });

  it("mapea schedule.day_view con date_key explicito", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "schedule.day_view",
        day: { date_key: "2026-03-20" }
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "agenda del 2026-03-20",
      runtime
    });

    expect(routed.intent).toBe("schedule.day_view");
    expect(routed.day).toEqual({
      type: "day",
      dateKey: "2026-03-20",
      label: "el 2026-03-20"
    });
  });

  it("devuelve unknown cuando quote está deshabilitado", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "quote.order",
        query: "cotiza pastel para 20"
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "cotiza pastel para 20",
      runtime,
      enableQuote: false
    });

    expect(routed.intent).toBe("unknown");
    expect(routed.openclaw_error).toBe("openclaw_quote_disabled");
  });

  it("expone payload no json cuando OpenClaw responde texto plano", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{ text: "rate limit reached" }]
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "estado del pedido op-123",
      runtime
    });

    expect(routed.intent).toBe("unknown");
    expect(routed.openclaw_error).toContain("openclaw_non_json_payload");
  });

  it("en modo estricto mantiene unknown cuando falla OpenClaw", async () => {
    const prev = process.env.OPENCLAW_STRICT;
    process.env.OPENCLAW_STRICT = "1";

    try {
      const runtime = {
        completeJson: async () => {
          throw new Error("openclaw_down");
        }
      };

      const routed = await routeReadOnlyIntentDetailed({
        text: "pedido de ana",
        runtime
      });

      expect(routed.intent).toBe("unknown");
      expect(routed.strict_mode).toBe(true);
      expect(routed.openclaw_error).toContain("openclaw_down");
    } finally {
      if (prev == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prev;
    }
  });
});
