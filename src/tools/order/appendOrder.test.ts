import { describe, expect, it, vi } from "vitest";

import type { Order } from "../../schemas/order";
import { createAppendOrderTool } from "./appendOrder";

function buildOrder(): Order {
  return {
    nombre_cliente: "Victor",
    producto: "cupcakes",
    cantidad: 12,
    tipo_envio: "recoger_en_tienda",
    fecha_hora_entrega: "2026-03-04T17:30:00.000Z",
    estado_pago: "pagado",
    total: 480,
    moneda: "MXN",
    notas: "sin nuez"
  };
}

describe("appendOrderTool", () => {
  it("returns dry-run by default", async () => {
    const tool = createAppendOrderTool();

    const result = await tool({
      operation_id: "op-1",
      chat_id: "chat-1",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(true);
    expect(result.detail).toContain("dry-run");
  });

  it("fails when dry-run is disabled and webhook url is missing", async () => {
    const fetchFn = vi.fn();
    const tool = createAppendOrderTool({
      fetchFn,
      dryRunDefault: false,
      apiKey: "secret"
    });

    await expect(
      tool({
        operation_id: "op-2",
        chat_id: "chat-2",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_url_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails when dry-run is disabled and api key is missing", async () => {
    const fetchFn = vi.fn();
    const tool = createAppendOrderTool({
      fetchFn,
      webhookUrl: "https://example.com/order",
      dryRunDefault: false
    });

    await expect(
      tool({
        operation_id: "op-3",
        chat_id: "chat-3",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_api_key_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("posts mapped payload when connector is enabled", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200 }));
    const tool = createAppendOrderTool({
      fetchFn,
      webhookUrl: "https://example.com/order",
      apiKey: "top-secret",
      apiKeyHeader: "x-order-key",
      dryRunDefault: false,
      timeoutMs: 2000,
      maxRetries: 0
    });

    const result = await tool({
      operation_id: "op-4",
      chat_id: "chat-4",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const row = body.row as Record<string, unknown>;

    expect(headers["x-order-key"]).toBe("top-secret");
    expect(body.operation_id).toBe("op-4");
    expect(body.chat_id).toBe("chat-4");
    expect(body.intent).toBe("pedido");
    expect(row.operation_id).toBe("op-4");
    expect(row.chat_id).toBe("chat-4");
    expect(row.folio).toBe("op-4");
    expect(row.producto).toBe("cupcakes");
  });

  it("retries once on retriable 5xx status", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const tool = createAppendOrderTool({
      fetchFn,
      webhookUrl: "https://example.com/order",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 2,
      retryBackoffMs: 0
    });

    const result = await tool({
      operation_id: "op-5",
      chat_id: "chat-5",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retriable 4xx status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    const tool = createAppendOrderTool({
      fetchFn,
      webhookUrl: "https://example.com/order",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 3,
      retryBackoffMs: 0
    });

    await expect(
      tool({
        operation_id: "op-6",
        chat_id: "chat-6",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_http_400");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("fails when upstream returns ok=false in JSON body with 200 status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: false, error: "order_unauthorized" })
    });

    const tool = createAppendOrderTool({
      fetchFn,
      webhookUrl: "https://example.com/order",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 0
    });

    await expect(
      tool({
        operation_id: "op-7",
        chat_id: "chat-7",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_remote_order_unauthorized");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("fails when upstream returns HTML with 200 status", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<!DOCTYPE html><html><body>Error: order_unauthorized</body></html>"
    });

    const tool = createAppendOrderTool({
      fetchFn,
      webhookUrl: "https://example.com/order",
      apiKey: "secret",
      dryRunDefault: false,
      maxRetries: 0
    });

    await expect(
      tool({
        operation_id: "op-8",
        chat_id: "chat-8",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_response_invalid");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("fails when gws live is missing range", async () => {
    const tool = createAppendOrderTool({
      provider: "gws",
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1"
    });

    await expect(
      tool({
        operation_id: "op-gws-1",
        chat_id: "chat-gws-1",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_gws_range_missing");
  });

  it("executes append via gws provider when configured", async () => {
    const gwsRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
      timedOut: false
    });

    const tool = createAppendOrderTool({
      provider: "gws",
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A1",
      gwsValueInputOption: "RAW",
      gwsRunner,
      maxRetries: 0
    });

    const result = await tool({
      operation_id: "op-gws-2",
      chat_id: "chat-gws-2",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(gwsRunner).toHaveBeenCalledTimes(1);
    const call = gwsRunner.mock.calls[0]?.[0] as { commandArgs: string[] };
    expect(call.commandArgs).toContain("spreadsheets");
    expect(call.commandArgs).toContain("append");
  });

  it("retries gws call on timeout and then succeeds", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: null,
        signal: "SIGKILL",
        stdout: "",
        stderr: "request timeout",
        timedOut: true
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({ ok: true }),
        stderr: "",
        timedOut: false
      });

    const tool = createAppendOrderTool({
      provider: "gws",
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A1",
      gwsRunner,
      maxRetries: 2,
      retryBackoffMs: 0
    });

    const result = await tool({
      operation_id: "op-gws-3",
      chat_id: "chat-gws-3",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });
});
