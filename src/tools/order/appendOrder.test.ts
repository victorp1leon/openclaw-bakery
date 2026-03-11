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

  it("fails when gws live is missing spreadsheet id", async () => {
    const tool = createAppendOrderTool({
      dryRunDefault: false,
      gwsRange: "Pedidos!A1"
    });

    await expect(
      tool({
        operation_id: "op-gws-1",
        chat_id: "chat-gws-1",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_gws_spreadsheet_id_missing");
  });

  it("fails when gws live is missing range", async () => {
    const tool = createAppendOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1"
    });

    await expect(
      tool({
        operation_id: "op-gws-1b",
        chat_id: "chat-gws-1b",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_gws_range_missing");
  });

  it("executes append via gws when configured", async () => {
    const gwsRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
      timedOut: false
    });

    const tool = createAppendOrderTool({
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

    const jsonIndex = call.commandArgs.indexOf("--json");
    const body = JSON.parse(call.commandArgs[jsonIndex + 1]) as { values: unknown[][] };
    const row = body.values[0] as unknown[];
    expect(row[18]).toBeTypeOf("string");
    expect(row[19]).toBe("activo");
    expect(row[20]).toBe("");
  });

  it("normalizes relative delivery datetime into fecha_hora_entrega_iso", async () => {
    const gwsRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
      timedOut: false
    });
    const tool = createAppendOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A1",
      gwsRunner,
      timezone: "America/Mexico_City",
      now: () => new Date("2026-03-07T12:00:00.000Z")
    });

    await tool({
      operation_id: "op-gws-2b",
      chat_id: "chat-gws-2b",
      payload: {
        ...buildOrder(),
        fecha_hora_entrega: "hoy, a las 6pm"
      }
    });

    const call = gwsRunner.mock.calls[0]?.[0] as { commandArgs: string[] };
    const jsonIndex = call.commandArgs.indexOf("--json");
    const body = JSON.parse(call.commandArgs[jsonIndex + 1]) as { values: unknown[][] };
    const row = body.values[0] as unknown[];
    expect(row[18]).toBe("2026-03-07T18:00:00");
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

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createAppendOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A1",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-gws-4",
        chat_id: "chat-gws-4",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_connector_gws_command_unavailable");
  });
});
