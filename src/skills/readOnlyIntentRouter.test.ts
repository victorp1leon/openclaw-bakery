import { describe, expect, it } from "vitest";

import { routeReadOnlyIntentDetailed } from "./readOnlyIntentRouter";

describe("routeReadOnlyIntentDetailed", () => {
  it("enruta admin.health sin campos extra", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "admin.health"
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "estado del bot",
      runtime
    });

    expect(routed.intent).toBe("admin.health");
    expect(routed.source).toBe("openclaw");
    expect(routed.query).toBeUndefined();
  });

  it("enruta admin.config.view sin campos extra", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "admin.config.view"
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "ver configuracion del bot",
      runtime
    });

    expect(routed.intent).toBe("admin.config.view");
    expect(routed.source).toBe("openclaw");
    expect(routed.query).toBeUndefined();
  });

  it("enruta admin.logs sin campos extra", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "admin.logs"
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "admin logs",
      runtime
    });

    expect(routed.intent).toBe("admin.logs");
    expect(routed.source).toBe("openclaw");
    expect(routed.query).toBeUndefined();
  });

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

  it("mapea report.reminders con period=today", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "report.reminders",
        period: { kind: "today" }
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "recordatorios de hoy",
      runtime
    });

    expect(routed.intent).toBe("report.reminders");
    expect(routed.period).toBe("today");
  });

  it("mapea report.reminders con period=month sin year/month al mes actual", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "report.reminders",
        period: { kind: "month" }
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "recordatorios de este mes",
      runtime,
      now: new Date("2026-03-25T12:00:00.000Z"),
      timezone: "America/Mexico_City"
    });

    expect(routed.intent).toBe("report.reminders");
    expect(routed.period).toEqual({
      type: "month",
      year: 2026,
      month: 3,
      label: "3/2026"
    });
  });

  it("mapea report.orders con period=year sin year al año actual", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "report.orders",
        period: { kind: "year" }
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "pedidos de este año",
      runtime,
      now: new Date("2026-03-25T12:00:00.000Z"),
      timezone: "America/Mexico_City"
    });

    expect(routed.intent).toBe("report.orders");
    expect(routed.period).toEqual({
      type: "year",
      year: 2026,
      label: "2026"
    });
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

  it("mapea schedule.week_view con anchor_date_key explicito", async () => {
    const runtime = {
      completeJson: async () => ({
        intent: "schedule.week_view",
        period: { kind: "week", anchor_date_key: "2026-03-23" }
      })
    };

    const routed = await routeReadOnlyIntentDetailed({
      text: "agenda semanal de 2026-03-23",
      runtime
    });

    expect(routed.intent).toBe("schedule.week_view");
    expect(routed.week).toEqual({
      type: "week",
      anchorDateKey: "2026-03-23",
      label: "semana de 2026-03-23"
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
