import { describe, expect, it, vi } from "vitest";

import { createCancelOrderTool } from "./cancelOrder";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

function buildHeader(): string[] {
  return [
    "fecha_registro",
    "folio",
    "fecha_hora_entrega",
    "nombre_cliente",
    "telefono",
    "producto",
    "descripcion_producto",
    "cantidad",
    "sabor_pan",
    "sabor_relleno",
    "tipo_envio",
    "direccion",
    "estado_pago",
    "total",
    "moneda",
    "notas",
    "chat_id",
    "operation_id",
    "fecha_hora_entrega_iso",
    "estado_pedido",
    "trello_card_id"
  ];
}

function buildRow(overrides: Partial<Record<number, string>> = {}): string[] {
  const row = [
    "2026-03-10T08:00:00.000Z",
    "op-order-1",
    "2026-03-12 10:00",
    "Ana",
    "5512345678",
    "pastel",
    "chocolate",
    "1",
    "chocolate",
    "oreo",
    "recoger_en_tienda",
    "",
    "pendiente",
    "900",
    "MXN",
    "nota inicial",
    "chat-1",
    "op-create-1",
    "2026-03-12T10:00:00",
    "",
    ""
  ];

  for (const [idx, value] of Object.entries(overrides)) {
    if (typeof value === "string") {
      row[Number(idx)] = value;
    }
  }

  return row;
}

describe("cancel-order tool", () => {
  it("fails when reference is missing", async () => {
    const tool = createCancelOrderTool();

    await expect(
      tool({
        operation_id: "op-cancel-1",
        chat_id: "chat-1",
        reference: {}
      })
    ).rejects.toThrow("order_cancel_reference_missing");
  });

  it("fails when order is not found", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), buildRow()] }));
    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-cancel-2",
        chat_id: "chat-1",
        reference: { folio: "op-missing" }
      })
    ).rejects.toThrow("order_cancel_not_found");
  });

  it("fails when order reference is ambiguous", async () => {
    const rows = [buildHeader(), buildRow(), buildRow({ 17: "op-create-2" })];
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-cancel-3",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" }
      })
    ).rejects.toThrow("order_cancel_reference_ambiguous");
  });

  it("appends cancel marker to notas", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce(okJson({ values: [buildHeader(), buildRow()] }))
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:S2" }));

    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      now: () => new Date("2026-03-11T12:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-cancel-4",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      motivo: "cliente no responde",
      trello_card_id: "card-abc-1"
    });

    expect(result.ok).toBe(true);
    expect(result.payload.already_canceled).toBe(false);

    const writeCallArgs = gwsRunner.mock.calls[1]?.[0];
    const jsonArgIdx = writeCallArgs.commandArgs.indexOf("--json");
    const body = JSON.parse(writeCallArgs.commandArgs[jsonArgIdx + 1]);
    const notes = String(body.values[0][15] ?? "");

    expect(notes).toContain("[CANCELADO]");
    expect(notes).toContain("op:op-cancel-4");
    expect(notes).toContain("chat:chat-1");
    expect(notes).toContain("motivo:cliente no responde");
    expect(body.values[0][19]).toBe("cancelado");
    expect(body.values[0][20]).toBe("card-abc-1");
  });

  it("returns already_canceled=true when marker exists", async () => {
    const row = buildRow({
      15: "nota previa | [CANCELADO] 2026-03-10 op:abc chat:chat-1 motivo:n/a",
      19: "cancelado",
      20: "card-already-1"
    });
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), row] }));
    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-cancel-5",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.already_canceled).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(1);
  });

  it("syncs trello_card_id even when order is already canceled", async () => {
    const row = buildRow({
      15: "nota previa | [CANCELADO] 2026-03-10 op:abc chat:chat-1 motivo:n/a",
      19: "cancelado",
      20: ""
    });
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce(okJson({ values: [buildHeader(), row] }))
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:U2" }));
    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-cancel-5b",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      trello_card_id: "card-new-777"
    });

    expect(result.ok).toBe(true);
    expect(result.payload.already_canceled).toBe(true);
    expect(result.payload.after?.trello_card_id).toBe("card-new-777");
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("retries on transient gws failure then succeeds", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: null,
        signal: "SIGKILL",
        stdout: "",
        stderr: "timed out",
        timedOut: true
      })
      .mockResolvedValueOnce(okJson({ values: [buildHeader(), buildRow()] }))
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:S2" }));

    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-cancel-6",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" }
    });

    expect(result.ok).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(3);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createCancelOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-cancel-7",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" }
      })
    ).rejects.toThrow("order_cancel_gws_command_unavailable");
  });
});
