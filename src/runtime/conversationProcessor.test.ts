import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dbPath = path.join(os.tmpdir(), `openclaw-flow-${Date.now()}-${Math.random()}.db`);
process.env.BOT_DB_PATH = dbPath;

let createConversationProcessor: (args: {
  allowedChatIds: Set<string>;
  rateLimiter?: {
    check: (chat_id: string) =>
      | { ok: true }
      | { ok: false; reason: "window_limit" | "blocked"; retryAfterSeconds: number };
  };
  nowMs?: () => number;
  newOperationId?: () => string;
  routeIntentDetailedFn?: (text: string) => Promise<{
    intent: "gasto" | "pedido" | "web" | "ayuda" | "unknown";
    source: "openclaw" | "fallback" | "custom";
    strict_mode: boolean;
    openclaw_error?: string;
  }>;
  routeIntentFn?: (text: string) => Promise<"gasto" | "pedido" | "web" | "ayuda" | "unknown">;
  parseExpenseFn?: (text: string) => Promise<
    { ok: true; payload: Record<string, unknown>; source?: "openclaw" | "fallback" | "custom" } |
    { ok: false; error: string; source?: "openclaw" | "fallback" | "custom" }
  >;
  parseOrderFn?: (text: string) => Promise<
    { ok: true; payload: Record<string, unknown>; source?: "openclaw" | "fallback" | "custom" } |
    { ok: false; error: string; source?: "openclaw" | "fallback" | "custom" }
  >;
  parseWebFn?: (text: string) => Promise<
    { ok: true; payload: Record<string, unknown>; source?: "openclaw" | "fallback" | "custom" } |
    { ok: false; error: string; source?: "openclaw" | "fallback" | "custom" }
  >;
  executeExpenseFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: {
      monto: number;
      concepto: string;
      moneda: string;
      categoria?: "insumos" | "servicios" | "otros";
      metodo_pago?: "efectivo" | "transferencia" | "tarjeta";
      proveedor?: string;
      fecha?: string;
      notas?: string;
    };
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeCreateCardFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: {
      nombre_cliente: string;
      producto: string;
      cantidad: number;
      tipo_envio: "envio_domicilio" | "recoger_en_tienda";
      fecha_hora_entrega: string;
      direccion?: string;
      telefono?: string;
      descripcion_producto?: string;
      sabor_pan?: "vainilla" | "chocolate" | "red_velvet" | "otro";
      sabor_relleno?: "cajeta" | "mermelada_fresa" | "oreo";
      estado_pago?: "pagado" | "pendiente" | "parcial";
      total?: number;
      moneda: string;
      notas?: string;
    };
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    detail: string;
    payload?: {
      trello_card_id?: string;
      trello_card_created?: boolean;
    };
  }>;
  executeAppendOrderFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: {
      nombre_cliente: string;
      producto: string;
      cantidad: number;
      tipo_envio: "envio_domicilio" | "recoger_en_tienda";
      fecha_hora_entrega: string;
      direccion?: string;
      telefono?: string;
      descripcion_producto?: string;
      sabor_pan?: "vainilla" | "chocolate" | "red_velvet" | "otro";
      sabor_relleno?: "cajeta" | "mermelada_fresa" | "oreo";
      estado_pago?: "pagado" | "pendiente" | "parcial";
      total?: number;
      moneda: string;
      notas?: string;
    };
    trello_card_id?: string;
    estado_pedido?: string;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeWebPublishFn?: (args: {
    operation_id: string;
    payload: {
      action: "crear" | "menu" | "publicar";
      content?: Record<string, unknown>;
    };
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeOrderReportFn?: (args: {
    chat_id: string;
    period:
      | { type: "day"; dateKey: string; label: string }
      | { type: "week"; anchorDateKey: string; label: string }
      | { type: "month"; year: number; month: number; label: string }
      | { type: "year"; year: number; label: string };
  }) => Promise<{
    period:
      | { type: "day"; dateKey: string; label: string }
      | { type: "week"; anchorDateKey: string; label: string }
      | { type: "month"; year: number; month: number; label: string }
      | { type: "year"; year: number; label: string };
    timezone: string;
    total: number;
    orders: Array<{
      folio: string;
      fecha_hora_entrega: string;
      nombre_cliente: string;
      producto: string;
      cantidad?: number;
      tipo_envio?: string;
      estado_pago?: string;
      total?: number;
      moneda?: string;
      operation_id?: string;
    }>;
    detail: string;
  }>;
  executeOrderLookupFn?: (args: {
    chat_id: string;
    query: string;
  }) => Promise<{
    query: string;
    timezone: string;
    total: number;
    orders: Array<{
      folio: string;
      fecha_hora_entrega: string;
      nombre_cliente: string;
      producto: string;
      cantidad?: number;
      tipo_envio?: string;
      estado_pago?: string;
      total?: number;
      moneda?: string;
      operation_id?: string;
    }>;
    detail: string;
  }>;
  executeOrderStatusFn?: (args: {
    chat_id: string;
    query: string;
  }) => Promise<{
    query: string;
    timezone: string;
    total: number;
    orders: Array<{
      folio: string;
      fecha_hora_entrega: string;
      nombre_cliente: string;
      producto: string;
      estado_pago?: string;
      estado_operativo: "programado" | "hoy" | "atrasado" | "cancelado";
      total?: number;
      moneda?: string;
      notas?: string;
      operation_id?: string;
    }>;
    detail: string;
  }>;
  executeOrderUpdateFn?: (args: {
    operation_id: string;
    chat_id: string;
    reference: {
      folio?: string;
      operation_id_ref?: string;
    };
    patch: unknown;
    trello_card_id?: string;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    payload: {
      reference: {
        folio?: string;
        operation_id_ref?: string;
      };
      patch: Record<string, unknown>;
      matched_row_index?: number;
      updated_fields?: string[];
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
    detail: string;
  }>;
  executeOrderCancelFn?: (args: {
    operation_id: string;
    chat_id: string;
    reference: {
      folio?: string;
      operation_id_ref?: string;
    };
    motivo?: string;
    trello_card_id?: string;
    dryRun?: boolean;
  }) => Promise<{
    ok: boolean;
    dry_run: boolean;
    operation_id: string;
    payload: {
      reference: {
        folio?: string;
        operation_id_ref?: string;
      };
      matched_row_index?: number;
      already_canceled: boolean;
      after?: Record<string, unknown>;
    };
    detail: string;
  }>;
  orderCardSync?: {
    updateCardForOrder: (args: {
      operation_id: string;
      chat_id: string;
      trello_card_id?: string;
      reference: { operation_id_ref?: string; folio?: string };
      patch: Record<string, unknown>;
      dryRun?: boolean;
    }) => Promise<{ card_id: string; snapshot: { card_id: string }; dry_run: boolean }>;
    cancelCardForOrder: (args: {
      operation_id: string;
      chat_id: string;
      trello_card_id?: string;
      reference: { operation_id_ref?: string; folio?: string };
      motivo?: string;
      dryRun?: boolean;
    }) => Promise<{ card_id: string; snapshot: { card_id: string }; dry_run: boolean }>;
    rollbackCard: (args: {
      operation_id: string;
      snapshot: { card_id: string };
      dryRun?: boolean;
    }) => Promise<void>;
    deleteCard: (args: {
      operation_id: string;
      card_id: string;
      dryRun?: boolean;
    }) => Promise<void>;
  };
  botPersona?: "neutral" | "bakery_warm" | "concise";
  webChatEnabled?: boolean;
  onTrace?: (event: {
    event: string;
    chat_id: string;
    strict_mode: boolean;
    intent?: string;
    intent_source?: string;
    parse_source?: string;
    detail?: string;
  }) => void;
}) => {
  handleMessage: (msg: { chat_id: string; text: string }) => Promise<string[]>;
};

let getOperation: (operation_id: string) => any;
let getState: (chat_id: string) => { pending?: { operation_id: string } };
let closeDatabase: () => void;

beforeAll(async () => {
  const runtimeMod = await import("./conversationProcessor");
  const ops = await import("../state/operations");
  const state = await import("../state/stateStore");
  const db = await import("../state/database");

  createConversationProcessor = runtimeMod.createConversationProcessor;
  getOperation = ops.getOperation;
  getState = state.getState;
  closeDatabase = db.closeDatabase;
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dbPath, { force: true });
});

describe("conversation processor security flow", () => {
  it("rechaza chats fuera de allowlist", async () => {
    const traces: Array<{ event: string; detail?: string }> = [];
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-ok"]),
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 100, concepto: "harina" } }),
      onTrace: (event) => traces.push(event)
    });

    const replies = await processor.handleMessage({ chat_id: "chat-no", text: "gasto 100 harina" });
    expect(replies[0]).toContain("No autorizado");
    expect(traces.find((t) => t.event === "allowlist_reject")?.detail).toBe("chat_id_not_allowed");
  });

  it("muestra ayuda ampliada con ejemplos y flujo de confirmacion", async () => {
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-help"]),
      routeIntentFn: async () => "ayuda"
    });

    const replies = await processor.handleMessage({ chat_id: "chat-help", text: "ayuda" });
    expect(replies[0]).toContain("Guía rápida");
    expect(replies[0]).toContain("recoger en tienda");
    expect(replies[0]).toContain("confirmar | cancelar");
  });

  it("permite cambiar la personalidad a bakery_warm", async () => {
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-help-warm"]),
      routeIntentFn: async () => "ayuda",
      botPersona: "bakery_warm"
    });

    const replies = await processor.handleMessage({ chat_id: "chat-help-warm", text: "ayuda" });
    expect(replies[0]).toContain("Guía rápida");
    expect(replies[0]).toContain("confirmar | cancelar");
  });

  it("resuelve consulta de pedidos por periodo sin pasar por intent router", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "day", dateKey: "2026-03-07", label: "hoy" } as const,
      timezone: "America/Mexico_City",
      total: 1,
      orders: [
        {
          folio: "op-report-1",
          fecha_hora_entrega: "2026-03-07 14:00",
          nombre_cliente: "Ana",
          producto: "cupcakes",
          cantidad: 12,
          tipo_envio: "recoger_en_tienda",
          estado_pago: "pagado",
          total: 480,
          moneda: "MXN",
          operation_id: "op-report-1"
        }
      ],
      detail: "report-orders executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-report"]),
      nowMs: () => Date.parse("2026-03-07T12:00:00.000Z"),
      routeIntentFn,
      executeOrderReportFn
    });

    const replies = await processor.handleMessage({ chat_id: "chat-report", text: "que pedidos tengo hoy" });
    expect(replies[0]).toContain("Pedidos para hoy");
    expect(replies[0]).toContain("Ana");
    expect(routeIntentFn).not.toHaveBeenCalled();
    expect(executeOrderReportFn).toHaveBeenCalledWith({
      chat_id: "chat-report",
      period: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });
  });

  it("resuelve consulta de pedidos por fecha explicita (dia)", async () => {
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "day", dateKey: "2026-04-28", label: "el 28 de abril" } as const,
      timezone: "America/Mexico_City",
      total: 0,
      orders: [],
      detail: "report-orders executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-report-day"]),
      nowMs: () => Date.parse("2026-03-07T12:00:00.000Z"),
      routeIntentFn: async () => "pedido",
      executeOrderReportFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-report-day",
      text: "dame los pedidos del 28 de abril"
    });

    expect(replies[0]).toContain("No encontré pedidos para el 28 de abril");
    expect(executeOrderReportFn).toHaveBeenCalledWith({
      chat_id: "chat-report-day",
      period: { type: "day", dateKey: "2026-04-28", label: "el 28 de abril" }
    });
  });

  it("resuelve consulta de pedidos para la siguiente semana", async () => {
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "week", anchorDateKey: "2026-03-14", label: "la siguiente semana" } as const,
      timezone: "America/Mexico_City",
      total: 0,
      orders: [],
      detail: "report-orders executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-report-next-week"]),
      nowMs: () => Date.parse("2026-03-07T12:00:00.000Z"),
      routeIntentFn: async () => "pedido",
      executeOrderReportFn
    });

    await processor.handleMessage({
      chat_id: "chat-report-next-week",
      text: "dame los pedidos de la siguiente semana"
    });

    expect(executeOrderReportFn).toHaveBeenCalledWith({
      chat_id: "chat-report-next-week",
      period: { type: "week", anchorDateKey: "2026-03-14", label: "la siguiente semana" }
    });
  });

  it("resuelve consulta de pedidos para mes actual y mes por nombre", async () => {
    const executeOrderReportFn = vi
      .fn()
      .mockResolvedValueOnce({
        period: { type: "month", year: 2026, month: 3, label: "este mes" } as const,
        timezone: "America/Mexico_City",
        total: 0,
        orders: [],
        detail: "report-orders executed (provider=gws, attempt=1)"
      })
      .mockResolvedValueOnce({
        period: { type: "month", year: 2026, month: 5, label: "mes de mayo" } as const,
        timezone: "America/Mexico_City",
        total: 0,
        orders: [],
        detail: "report-orders executed (provider=gws, attempt=1)"
      });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-report-month"]),
      nowMs: () => Date.parse("2026-03-07T12:00:00.000Z"),
      routeIntentFn: async () => "pedido",
      executeOrderReportFn
    });

    await processor.handleMessage({
      chat_id: "chat-report-month",
      text: "dame los pedidos de este mes"
    });
    await processor.handleMessage({
      chat_id: "chat-report-month",
      text: "dame los pedidos del mes de mayo"
    });

    expect(executeOrderReportFn).toHaveBeenNthCalledWith(1, {
      chat_id: "chat-report-month",
      period: { type: "month", year: 2026, month: 3, label: "este mes" }
    });
    expect(executeOrderReportFn).toHaveBeenNthCalledWith(2, {
      chat_id: "chat-report-month",
      period: { type: "month", year: 2026, month: 5, label: "mes de mayo" }
    });
  });

  it("resuelve consulta de pedidos para este año", async () => {
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "year", year: 2026, label: "este año" } as const,
      timezone: "America/Mexico_City",
      total: 0,
      orders: [],
      detail: "report-orders executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-report-year"]),
      nowMs: () => Date.parse("2026-03-07T12:00:00.000Z"),
      routeIntentFn: async () => "pedido",
      executeOrderReportFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-report-year",
      text: "dame los pedidos de este año"
    });

    expect(replies[0]).toContain("No encontré pedidos para este año");
    expect(executeOrderReportFn).toHaveBeenCalledWith({
      chat_id: "chat-report-year",
      period: { type: "year", year: 2026, label: "este año" }
    });
  });

  it("resuelve consulta de pedido por nombre sin pasar por intent router", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);
    const executeOrderLookupFn = vi.fn(async () => ({
      query: "ana",
      timezone: "America/Mexico_City",
      total: 1,
      orders: [
        {
          folio: "op-lookup-1",
          fecha_hora_entrega: "2026-03-07 14:00",
          nombre_cliente: "Ana",
          producto: "cupcakes",
          cantidad: 12,
          estado_pago: "pagado",
          total: 480,
          moneda: "MXN"
        }
      ],
      detail: "lookup-order executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-lookup"]),
      routeIntentFn,
      executeOrderLookupFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-lookup",
      text: "consulta pedido de Ana"
    });

    expect(replies[0]).toContain('Pedidos encontrados para "ana"');
    expect(replies[0]).toContain("op-lookup-1");
    expect(routeIntentFn).not.toHaveBeenCalled();
    expect(executeOrderLookupFn).toHaveBeenCalledWith({
      chat_id: "chat-lookup",
      query: "ana"
    });
  });

  it("resuelve consulta de pedido por folio", async () => {
    const executeOrderLookupFn = vi.fn(async () => ({
      query: "op-xyz-123",
      timezone: "America/Mexico_City",
      total: 0,
      orders: [],
      detail: "lookup-order executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-lookup-folio"]),
      routeIntentFn: async () => "pedido",
      executeOrderLookupFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-lookup-folio",
      text: "buscar pedido folio op-xyz-123"
    });

    expect(replies[0]).toContain('No encontré pedidos para "op-xyz-123"');
    expect(executeOrderLookupFn).toHaveBeenCalledWith({
      chat_id: "chat-lookup-folio",
      query: "op-xyz-123"
    });
  });

  it("resuelve consulta de estado de pedido sin pasar por intent router", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);
    const executeOrderStatusFn = vi.fn(async () => ({
      query: "op-xyz-123",
      timezone: "America/Mexico_City",
      total: 1,
      orders: [
        {
          folio: "op-xyz-123",
          fecha_hora_entrega: "2026-03-08 10:00",
          nombre_cliente: "Ana",
          producto: "pastel",
          estado_pago: "pendiente",
          estado_operativo: "programado" as const,
          total: 900,
          moneda: "MXN"
        }
      ],
      detail: "order-status executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-status"]),
      routeIntentFn,
      executeOrderStatusFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-status",
      text: "cual es el estado del pedido folio op-xyz-123"
    });

    expect(replies[0]).toContain('Estado de pedidos para "op-xyz-123"');
    expect(replies[0]).toContain("estado:programado");
    expect(routeIntentFn).not.toHaveBeenCalled();
    expect(executeOrderStatusFn).toHaveBeenCalledWith({
      chat_id: "chat-status",
      query: "op-xyz-123"
    });
  });

  it("responde no encontrado en consulta de estado", async () => {
    const executeOrderStatusFn = vi.fn(async () => ({
      query: "inexistente",
      timezone: "America/Mexico_City",
      total: 0,
      orders: [],
      detail: "order-status executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-status-empty"]),
      routeIntentFn: async () => "pedido",
      executeOrderStatusFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-status-empty",
      text: "dime el estado del pedido de inexistente"
    });

    expect(replies[0]).toContain('No encontré el estado para "inexistente"');
    expect(executeOrderStatusFn).toHaveBeenCalledWith({
      chat_id: "chat-status-empty",
      query: "inexistente"
    });
  });

  it("inicia flujo de order.update con resumen y confirmacion", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);
    const executeOrderUpdateFn = vi.fn(async ({ operation_id, reference, patch }) => ({
      ok: true,
      dry_run: false,
      operation_id,
      payload: {
        reference,
        patch: patch as Record<string, unknown>,
        matched_row_index: 12,
        updated_fields: ["cantidad", "notas"]
      },
      detail: "update-order executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-update"]),
      nowMs: () => Date.parse("2026-03-11T12:00:00.000Z"),
      newOperationId: () => "op-order-update",
      routeIntentFn,
      executeOrderUpdateFn
    });

    const summary = await processor.handleMessage({
      chat_id: "chat-order-update",
      text: 'actualiza pedido folio op-xyz-123 {"patch":{"cantidad":10}}'
    });
    expect(summary[0]).toContain("Resumen");
    expect(summary[0]).toContain("order.update");
    expect(routeIntentFn).not.toHaveBeenCalled();

    const done = await processor.handleMessage({ chat_id: "chat-order-update", text: "confirmar" });
    expect(done[0]).toContain("Ejecutado");
    expect(executeOrderUpdateFn).toHaveBeenCalledWith({
      operation_id: "op-order-update",
      chat_id: "chat-order-update",
      reference: { folio: "op-xyz-123", operation_id_ref: undefined },
      patch: { cantidad: 10 },
      trello_card_id: "trello-dry-run-card"
    });
    expect(getOperation("op-order-update")?.status).toBe("executed");
  });

  it("devuelve parse error cuando order.update no incluye patch", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-update-parse"]),
      routeIntentFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-order-update-parse",
      text: "actualiza pedido folio op-xyz-123"
    });

    expect(replies[0]).toContain("order_update_patch_missing");
    expect(routeIntentFn).not.toHaveBeenCalled();
  });

  it("mantiene pendiente y marca failed cuando falla order.update", async () => {
    const executeOrderUpdateFn = vi.fn(async () => {
      throw new Error("order_update_gws_write_rate_limit");
    });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-update-fail"]),
      nowMs: () => Date.parse("2026-03-11T12:00:00.000Z"),
      newOperationId: () => "op-order-update-fail",
      routeIntentFn: async () => "pedido",
      executeOrderUpdateFn
    });

    await processor.handleMessage({
      chat_id: "chat-order-update-fail",
      text: 'actualiza pedido folio op-xyz-123 {"patch":{"estado_pago":"pagado"}}'
    });
    const failed = await processor.handleMessage({ chat_id: "chat-order-update-fail", text: "confirmar" });

    expect(failed[0]).toContain("No se pudo ejecutar el pedido");
    expect(getOperation("op-order-update-fail")?.status).toBe("failed");
    expect(getState("chat-order-update-fail").pending?.operation_id).toBe("op-order-update-fail");
  });

  it("revierte cambio en trello cuando falla sheets en order.update", async () => {
    const rollbackCard = vi.fn(async () => undefined);
    const executeOrderUpdateFn = vi.fn(async () => {
      throw new Error("order_update_gws_write_rate_limit");
    });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-update-rollback"]),
      nowMs: () => Date.parse("2026-03-11T12:00:00.000Z"),
      newOperationId: () => "op-order-update-rollback",
      routeIntentFn: async () => "pedido",
      executeOrderUpdateFn,
      orderCardSync: {
        updateCardForOrder: vi.fn(async () => ({ card_id: "card-1", snapshot: { card_id: "card-1" }, dry_run: false })),
        cancelCardForOrder: vi.fn(async () => ({ card_id: "card-1", snapshot: { card_id: "card-1" }, dry_run: false })),
        rollbackCard,
        deleteCard: vi.fn(async () => undefined)
      }
    });

    await processor.handleMessage({
      chat_id: "chat-order-update-rollback",
      text: 'actualiza pedido folio op-xyz-123 {"patch":{"estado_pago":"pagado"}}'
    });
    await processor.handleMessage({ chat_id: "chat-order-update-rollback", text: "confirmar" });

    expect(rollbackCard).toHaveBeenCalledTimes(1);
    expect(rollbackCard).toHaveBeenCalledWith({
      operation_id: "op-order-update-rollback",
      snapshot: { card_id: "card-1" },
      dryRun: false
    });
  });

  it("inicia flujo de order.cancel con resumen y confirmacion", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);
    const executeOrderCancelFn = vi.fn(async ({ operation_id, reference, motivo }) => ({
      ok: true,
      dry_run: false,
      operation_id,
      payload: {
        reference,
        matched_row_index: 9,
        already_canceled: false,
        after: {
          folio: reference.folio ?? "",
          notas: `[CANCELADO] op:${operation_id} motivo:${motivo ?? "n/a"}`
        }
      },
      detail: "cancel-order executed (provider=gws, attempt=1)"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-cancel"]),
      nowMs: () => Date.parse("2026-03-11T12:00:00.000Z"),
      newOperationId: () => "op-order-cancel",
      routeIntentFn,
      executeOrderCancelFn
    });

    const summary = await processor.handleMessage({
      chat_id: "chat-order-cancel",
      text: 'cancela pedido folio op-xyz-123 {"motivo":"cliente cancelo"}'
    });
    expect(summary[0]).toContain("Resumen");
    expect(summary[0]).toContain("order.cancel");
    expect(routeIntentFn).not.toHaveBeenCalled();

    const done = await processor.handleMessage({ chat_id: "chat-order-cancel", text: "confirmar" });
    expect(done[0]).toContain("Ejecutado");
    expect(executeOrderCancelFn).toHaveBeenCalledWith({
      operation_id: "op-order-cancel",
      chat_id: "chat-order-cancel",
      reference: { folio: "op-xyz-123", operation_id_ref: undefined },
      motivo: "cliente cancelo",
      trello_card_id: "trello-dry-run-card"
    });
    expect(getOperation("op-order-cancel")?.status).toBe("executed");
  });

  it("devuelve parse error cuando order.cancel no incluye referencia", async () => {
    const routeIntentFn = vi.fn(async () => "pedido" as const);

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-cancel-parse"]),
      routeIntentFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-order-cancel-parse",
      text: 'cancela pedido {"motivo":"cliente cancelo"}'
    });

    expect(replies[0]).toContain("order_cancel_reference_missing");
    expect(routeIntentFn).not.toHaveBeenCalled();
  });

  it("mantiene pendiente y marca failed cuando falla order.cancel", async () => {
    const executeOrderCancelFn = vi.fn(async () => {
      throw new Error("order_cancel_gws_write_rate_limit");
    });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-cancel-fail"]),
      nowMs: () => Date.parse("2026-03-11T12:00:00.000Z"),
      newOperationId: () => "op-order-cancel-fail",
      routeIntentFn: async () => "pedido",
      executeOrderCancelFn
    });

    await processor.handleMessage({
      chat_id: "chat-order-cancel-fail",
      text: "cancela pedido folio op-xyz-123"
    });
    const failed = await processor.handleMessage({ chat_id: "chat-order-cancel-fail", text: "confirmar" });

    expect(failed[0]).toContain("No se pudo ejecutar el pedido");
    expect(getOperation("op-order-cancel-fail")?.status).toBe("failed");
    expect(getState("chat-order-cancel-fail").pending?.operation_id).toBe("op-order-cancel-fail");
  });

  it("revierte cambio en trello cuando falla sheets en order.cancel", async () => {
    const rollbackCard = vi.fn(async () => undefined);
    const executeOrderCancelFn = vi.fn(async () => {
      throw new Error("order_cancel_gws_write_rate_limit");
    });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-cancel-rollback"]),
      nowMs: () => Date.parse("2026-03-11T12:00:00.000Z"),
      newOperationId: () => "op-order-cancel-rollback",
      routeIntentFn: async () => "pedido",
      executeOrderCancelFn,
      orderCardSync: {
        updateCardForOrder: vi.fn(async () => ({ card_id: "card-1", snapshot: { card_id: "card-1" }, dry_run: false })),
        cancelCardForOrder: vi.fn(async () => ({ card_id: "card-1", snapshot: { card_id: "card-1" }, dry_run: false })),
        rollbackCard,
        deleteCard: vi.fn(async () => undefined)
      }
    });

    await processor.handleMessage({
      chat_id: "chat-order-cancel-rollback",
      text: "cancela pedido folio op-xyz-123"
    });
    await processor.handleMessage({ chat_id: "chat-order-cancel-rollback", text: "confirmar" });

    expect(rollbackCard).toHaveBeenCalledTimes(1);
    expect(rollbackCard).toHaveBeenCalledWith({
      operation_id: "op-order-cancel-rollback",
      snapshot: { card_id: "card-1" },
      dryRun: false
    });
  });

  it("no confunde alta de pedido con consulta de reporte", async () => {
    const executeOrderReportFn = vi.fn();
    const executeOrderLookupFn = vi.fn();
    const parseOrderFn = vi.fn(async () => ({
      ok: true as const,
      payload: {
        nombre_cliente: "Victor",
        producto: "cupcakes",
        cantidad: 12,
        tipo_envio: "recoger_en_tienda" as const,
        fecha_hora_entrega: "2026-03-08 14:00",
        moneda: "MXN"
      }
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-create"]),
      nowMs: () => Date.parse("2026-03-07T12:00:00.000Z"),
      newOperationId: () => "op-order-create",
      routeIntentFn: async () => "pedido",
      parseOrderFn,
      executeOrderReportFn,
      executeOrderLookupFn
    });

    const replies = await processor.handleMessage({
      chat_id: "chat-order-create",
      text: "pedido Victor 12 cupcakes para mañana 2pm recoger"
    });

    expect(replies[0]).toContain("Resumen");
    expect(parseOrderFn).toHaveBeenCalledTimes(1);
    expect(executeOrderReportFn).not.toHaveBeenCalled();
    expect(executeOrderLookupFn).not.toHaveBeenCalled();
  });

  it("pregunta solo 1 faltante por turno y luego confirma", async () => {
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-missing"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-missing",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { concepto: "harina" } })
    });

    const ask = await processor.handleMessage({ chat_id: "chat-missing", text: "gasto harina" });
    expect(ask[0]).toContain("monto");

    const summary = await processor.handleMessage({ chat_id: "chat-missing", text: "380" });
    expect(summary[0]).toContain("Resumen");
    expect(summary[0]).toContain("confirmar | cancelar");

    const done = await processor.handleMessage({ chat_id: "chat-missing", text: "confirmar" });
    expect(done[0]).toContain("Ejecutado");

    const op = getOperation("op-missing");
    expect(op?.status).toBe("executed");
  });

  it("ejecuta expense tool en confirmacion de gasto", async () => {
    const executeExpenseFn = vi.fn(async ({ operation_id }) => ({
      ok: true,
      dry_run: false,
      operation_id,
      detail: "append-expense executed"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-expense"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-expense",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 120, concepto: "harina" } }),
      executeExpenseFn
    });

    await processor.handleMessage({ chat_id: "chat-expense", text: "gasto 120 harina" });
    const done = await processor.handleMessage({ chat_id: "chat-expense", text: "confirmar" });

    expect(done[0]).toContain("Ejecutado");
    expect(executeExpenseFn).toHaveBeenCalledTimes(1);
    expect(getOperation("op-expense")?.status).toBe("executed");
  });

  it("mantiene pendiente y marca failed cuando falla expense tool", async () => {
    const executeExpenseFn = vi.fn(async () => {
      throw new Error("expense_connector_http_503");
    });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-expense-fail"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-expense-fail",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 200, concepto: "azucar" } }),
      executeExpenseFn
    });

    await processor.handleMessage({ chat_id: "chat-expense-fail", text: "gasto 200 azucar" });
    const failed = await processor.handleMessage({ chat_id: "chat-expense-fail", text: "confirmar" });

    expect(failed[0]).toContain("No se pudo ejecutar el gasto");
    expect(getOperation("op-expense-fail")?.status).toBe("failed");
    expect(getState("chat-expense-fail").pending?.operation_id).toBe("op-expense-fail");
  });

  it("ejecuta create-card y append-order al confirmar pedido", async () => {
    const executeCreateCardFn = vi.fn(async ({ operation_id }) => ({
      ok: true,
      dry_run: false,
      operation_id,
      detail: "create-card executed"
    }));
    const executeAppendOrderFn = vi.fn(async ({ operation_id }) => ({
      ok: true,
      dry_run: false,
      operation_id,
      detail: "append-order executed"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-order",
      routeIntentFn: async () => "pedido",
      parseOrderFn: async () => ({
        ok: true,
        payload: {
          nombre_cliente: "Victor",
          producto: "cupcakes",
          cantidad: 12,
          tipo_envio: "recoger_en_tienda",
          fecha_hora_entrega: "2026-02-20 14:00",
          moneda: "MXN"
        }
      }),
      executeCreateCardFn,
      executeAppendOrderFn
    });

    await processor.handleMessage({ chat_id: "chat-order", text: "pedido Victor 12 cupcakes recoger" });
    const done = await processor.handleMessage({ chat_id: "chat-order", text: "confirmar" });

    expect(done[0]).toContain("Ejecutado");
    expect(executeCreateCardFn).toHaveBeenCalledTimes(1);
    expect(executeAppendOrderFn).toHaveBeenCalledTimes(1);
    expect(getOperation("op-order")?.status).toBe("executed");
  });

  it("acepta 'recoger en tienda' al completar tipo_envio faltante", async () => {
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-missing-shipping"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-order-missing-shipping",
      routeIntentFn: async () => "pedido",
      parseOrderFn: async () => ({
        ok: true,
        payload: {
          nombre_cliente: "Victor",
          producto: "cupcakes",
          cantidad: 12,
          fecha_hora_entrega: "2026-02-20 14:00"
        }
      })
    });

    const ask = await processor.handleMessage({ chat_id: "chat-order-missing-shipping", text: "pedido Victor 12 cupcakes" });
    expect(ask[0]).toContain("Tipo de envío");

    const summary = await processor.handleMessage({ chat_id: "chat-order-missing-shipping", text: "recoger en tienda" });
    expect(summary[0]).toContain("Resumen");
    expect(summary[0]).toContain("recoger_en_tienda");
  });

  it("mantiene pendiente y marca failed cuando falla append-order", async () => {
    const executeCreateCardFn = vi.fn(async ({ operation_id }) => ({
      ok: true,
      dry_run: false,
      operation_id,
      detail: "create-card executed",
      payload: {
        trello_card_id: "card-123",
        trello_card_created: true
      }
    }));
    const executeAppendOrderFn = vi.fn(async () => {
      throw new Error("order_connector_http_503");
    });
    const deleteCard = vi.fn(async () => undefined);

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-order-fail"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-order-fail",
      routeIntentFn: async () => "pedido",
      parseOrderFn: async () => ({
        ok: true,
        payload: {
          nombre_cliente: "Victor",
          producto: "cupcakes",
          cantidad: 12,
          tipo_envio: "recoger_en_tienda",
          fecha_hora_entrega: "2026-02-20 14:00",
          moneda: "MXN"
        }
      }),
      executeCreateCardFn,
      executeAppendOrderFn,
      orderCardSync: {
        updateCardForOrder: vi.fn(async () => ({ card_id: "card-123", snapshot: { card_id: "card-123" }, dry_run: false })),
        cancelCardForOrder: vi.fn(async () => ({ card_id: "card-123", snapshot: { card_id: "card-123" }, dry_run: false })),
        rollbackCard: vi.fn(async () => undefined),
        deleteCard
      }
    });

    await processor.handleMessage({ chat_id: "chat-order-fail", text: "pedido Victor 12 cupcakes recoger" });
    const failed = await processor.handleMessage({ chat_id: "chat-order-fail", text: "confirmar" });

    expect(failed[0]).toContain("No se pudo ejecutar el pedido");
    expect(executeCreateCardFn).toHaveBeenCalledTimes(1);
    expect(executeAppendOrderFn).toHaveBeenCalledTimes(1);
    expect(deleteCard).toHaveBeenCalledTimes(1);
    expect(deleteCard).toHaveBeenCalledWith({
      operation_id: "op-order-fail",
      card_id: "card-123",
      dryRun: false
    });
    expect(getOperation("op-order-fail")?.status).toBe("failed");
    expect(getState("chat-order-fail").pending?.operation_id).toBe("op-order-fail");
  });

  it("ejecuta flujo web con faltantes y confirmacion", async () => {
    const executeWebPublishFn = vi.fn(async ({ operation_id }) => ({
      ok: true,
      dry_run: true,
      operation_id,
      detail: "web-publish dry-run"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-web"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-web",
      routeIntentFn: async () => "web",
      parseWebFn: async () => ({ ok: true, payload: { action: "crear", content: {} } }),
      executeWebPublishFn
    });

    const askBusiness = await processor.handleMessage({ chat_id: "chat-web", text: "web crear" });
    expect(askBusiness[0]).toContain("nombre del negocio");

    const askWhatsapp = await processor.handleMessage({ chat_id: "chat-web", text: "Hadi Bakery" });
    expect(askWhatsapp[0]).toContain("WhatsApp");

    const summary = await processor.handleMessage({ chat_id: "chat-web", text: "+5215512345678" });
    expect(summary[0]).toContain("Resumen");

    const done = await processor.handleMessage({ chat_id: "chat-web", text: "confirmar" });
    expect(done[0]).toContain("Ejecutado");
    expect(executeWebPublishFn).toHaveBeenCalledTimes(1);
    expect(getOperation("op-web")?.status).toBe("executed");
  });

  it("ejecuta web.publish con JSON inline al confirmar", async () => {
    const executeWebPublishFn = vi.fn(async ({ operation_id }) => ({
      ok: true,
      dry_run: true,
      operation_id,
      detail: "web-publish dry-run"
    }));

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-web-inline"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-web-inline",
      routeIntentFn: async () => "web",
      executeWebPublishFn
    });

    const msg =
      'web menu {"catalogItems":[{"id":"item-1","nombre":"Cupcake","precio":45,"imageUrl":"https://facebook.com/p/abc","imageSource":"manual"}]}';
    const summary = await processor.handleMessage({ chat_id: "chat-web-inline", text: msg });
    expect(summary[0]).toContain("Resumen");

    const done = await processor.handleMessage({ chat_id: "chat-web-inline", text: "confirmar" });
    expect(done[0]).toContain("Ejecutado");
    expect(executeWebPublishFn).toHaveBeenCalledTimes(1);
    expect(getOperation("op-web-inline")?.status).toBe("executed");
  });

  it("mantiene pendiente y marca failed cuando falla web.publish", async () => {
    const executeWebPublishFn = vi.fn(async () => {
      throw new Error("web_publish_http_503");
    });

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-web-fail"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-web-fail",
      routeIntentFn: async () => "web",
      parseWebFn: async () => ({ ok: true, payload: { action: "publicar" } }),
      executeWebPublishFn
    });

    await processor.handleMessage({ chat_id: "chat-web-fail", text: "web publicar" });
    const failed = await processor.handleMessage({ chat_id: "chat-web-fail", text: "confirmar" });

    expect(failed[0]).toContain("No se pudo ejecutar la publicación web");
    expect(getOperation("op-web-fail")?.status).toBe("failed");
    expect(getState("chat-web-fail").pending?.operation_id).toBe("op-web-fail");
  });

  it("rechaza intent web cuando chat web está deshabilitado", async () => {
    const executeWebPublishFn = vi.fn();

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-web-disabled"]),
      routeIntentFn: async () => "web",
      webChatEnabled: false,
      executeWebPublishFn
    });

    const replies = await processor.handleMessage({ chat_id: "chat-web-disabled", text: "web crear" });
    expect(replies[0]).toContain("deshabilitada");
    expect(replies[0]).toContain("npm run web:publish");
    expect(executeWebPublishFn).not.toHaveBeenCalled();
  });

  it("bloquea nueva intención si hay pendiente esperando confirmar/cancelar", async () => {
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-pending"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-pending",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 100, concepto: "harina" } })
    });

    const summary = await processor.handleMessage({ chat_id: "chat-pending", text: "gasto 100 harina" });
    expect(summary[0]).toContain("Resumen");

    const blocked = await processor.handleMessage({ chat_id: "chat-pending", text: "gasto 200 azucar" });
    expect(blocked[0]).toContain("operación pendiente");

    const canceled = await processor.handleMessage({ chat_id: "chat-pending", text: "cancelar" });
    expect(canceled[0]).toContain("Cancelado");
  });

  it("detecta duplicados en ventana de 10 minutos", async () => {
    const operationIds = ["op-dup-1", "op-dup-2"];

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-dup"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => operationIds.shift() ?? "op-dup-x",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 380, concepto: "harina" } })
    });

    const summary = await processor.handleMessage({ chat_id: "chat-dup", text: "gasto 380 harina" });
    expect(summary[0]).toContain("Resumen");

    await processor.handleMessage({ chat_id: "chat-dup", text: "confirmar" });

    const duplicate = await processor.handleMessage({ chat_id: "chat-dup", text: "gasto 380 harina" });
    expect(duplicate[0]).toContain("Operación duplicada");
    expect(duplicate[0]).toContain("op-dup-1");
  });

  it("emite trazas con source de intent y parse", async () => {
    const traces: Array<{ event: string; intent_source?: string; parse_source?: string }> = [];

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-trace"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-trace",
      routeIntentDetailedFn: async () => ({ intent: "gasto", source: "openclaw", strict_mode: false }),
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 120, concepto: "harina" }, source: "fallback" }),
      onTrace: (event) => traces.push(event)
    });

    const replies = await processor.handleMessage({ chat_id: "chat-trace", text: "agrega un gasto de harina de 120 pesos" });
    expect(replies[0]).toContain("Resumen");

    const intentTrace = traces.find((event) => event.event === "intent_routed");
    const parseTrace = traces.find((event) => event.event === "parse_succeeded");

    expect(intentTrace?.intent_source).toBe("openclaw");
    expect(parseTrace?.parse_source).toBe("fallback");
  });

  it("rechaza mensaje cuando el rate limit está activo", async () => {
    let parseCalls = 0;
    const traces: Array<{ event: string; detail?: string }> = [];

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-rate"]),
      rateLimiter: {
        check: () => ({ ok: false, reason: "window_limit", retryAfterSeconds: 12 })
      },
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => {
        parseCalls += 1;
        return { ok: true, payload: { monto: 100, concepto: "harina" } };
      },
      onTrace: (event) => traces.push(event)
    });

    const replies = await processor.handleMessage({ chat_id: "chat-rate", text: "gasto 100 harina" });
    expect(replies[0]).toContain("Demasiados mensajes");
    expect(replies[0]).toContain("12s");
    expect(parseCalls).toBe(0);
    expect(traces.find((t) => t.event === "rate_limit_reject")?.detail).toContain("retry_after=12s");
  });

  it("acepta atajos de confirmacion y cancelacion", async () => {
    const processor = createConversationProcessor({
      allowedChatIds: new Set(["chat-shortcuts"]),
      nowMs: () => Date.parse("2026-02-19T12:00:00.000Z"),
      newOperationId: () => "op-shortcuts",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async (text) =>
        text.includes("120")
          ? { ok: true, payload: { monto: 120, concepto: "azucar" } }
          : { ok: true, payload: { monto: 100, concepto: "harina" } }
    });

    await processor.handleMessage({ chat_id: "chat-shortcuts", text: "gasto 100 harina" });
    const confirmed = await processor.handleMessage({ chat_id: "chat-shortcuts", text: "sí" });
    expect(confirmed[0]).toContain("Ejecutado");

    await processor.handleMessage({ chat_id: "chat-shortcuts", text: "gasto 120 azucar" });
    const canceled = await processor.handleMessage({ chat_id: "chat-shortcuts", text: "no" });
    expect(canceled[0]).toContain("Cancelado");
  });
});
