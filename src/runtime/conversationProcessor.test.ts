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
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
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
      detail: "create-card executed"
    }));
    const executeAppendOrderFn = vi.fn(async () => {
      throw new Error("order_connector_http_503");
    });

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
      executeAppendOrderFn
    });

    await processor.handleMessage({ chat_id: "chat-order-fail", text: "pedido Victor 12 cupcakes recoger" });
    const failed = await processor.handleMessage({ chat_id: "chat-order-fail", text: "confirmar" });

    expect(failed[0]).toContain("No se pudo ejecutar el pedido");
    expect(executeCreateCardFn).toHaveBeenCalledTimes(1);
    expect(executeAppendOrderFn).toHaveBeenCalledTimes(1);
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
});
