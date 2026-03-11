import { describe, expect, it, vi } from "vitest";

import { createUpdateOrderTool } from "./updateOrder";

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
    "fecha_hora_entrega_iso"
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
    "2026-03-12T10:00:00"
  ];

  for (const [idx, value] of Object.entries(overrides)) {
    if (typeof value === "string") {
      row[Number(idx)] = value;
    }
  }

  return row;
}

describe("update-order tool", () => {
  it("fails when reference is missing", async () => {
    const tool = createUpdateOrderTool();

    await expect(
      tool({
        operation_id: "op-update-1",
        chat_id: "chat-1",
        reference: {},
        patch: { cantidad: 2 }
      })
    ).rejects.toThrow("order_update_reference_missing");
  });

  it("fails when patch is empty", async () => {
    const tool = createUpdateOrderTool();

    await expect(
      tool({
        operation_id: "op-update-1",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        patch: {}
      })
    ).rejects.toThrow("order_update_patch_empty");
  });

  it("fails when order is not found", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), buildRow()] }));
    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-update-2",
        chat_id: "chat-1",
        reference: { folio: "op-missing" },
        patch: { cantidad: 3 }
      })
    ).rejects.toThrow("order_update_not_found");
  });

  it("fails when order reference is ambiguous", async () => {
    const rows = [buildHeader(), buildRow(), buildRow({ 17: "op-create-2" })];
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-update-3",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        patch: { cantidad: 2 }
      })
    ).rejects.toThrow("order_update_reference_ambiguous");
  });

  it("fails when patch contains immutable field", async () => {
    const tool = createUpdateOrderTool();

    await expect(
      tool({
        operation_id: "op-update-4",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        patch: { folio: "otro" }
      })
    ).rejects.toThrow("order_update_patch_field_immutable");
  });

  it("fails when shipping invariant breaks", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), buildRow()] }));
    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-update-5",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        patch: { tipo_envio: "envio_domicilio" }
      })
    ).rejects.toThrow("order_update_shipping_invariant_violation");
  });

  it("recomputes fecha_hora_entrega_iso when delivery changes", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce(okJson({ values: [buildHeader(), buildRow()] }))
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:S2" }));

    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      timezone: "America/Mexico_City",
      now: () => new Date("2026-03-11T10:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-update-6",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      patch: { fecha_hora_entrega: "2026-03-12 16:30" }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.after?.fecha_hora_entrega_iso).toBe("2026-03-12T16:30:00");
    expect(result.payload.updated_fields).toContain("fecha_hora_entrega_iso");

    const writeCallArgs = gwsRunner.mock.calls[1]?.[0];
    const jsonArgIdx = writeCallArgs.commandArgs.indexOf("--json");
    const body = JSON.parse(writeCallArgs.commandArgs[jsonArgIdx + 1]);
    expect(body.values[0][18]).toBe("2026-03-12T16:30:00");
    expect(String(body.values[0][15])).toContain("[UPDATE]");
    expect(body.values[0][5]).toBe("pastel");
  });

  it("updates only allowed fields and preserves others", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce(okJson({ values: [buildHeader(), buildRow()] }))
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:S2" }));

    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      now: () => new Date("2026-03-11T10:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-update-7",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      patch: { cantidad: 3, estado_pago: "parcial" }
    });

    expect(result.payload.updated_fields).toEqual(expect.arrayContaining(["cantidad", "estado_pago", "notas"]));
    expect(result.payload.after?.cantidad).toBe(3);
    expect(result.payload.after?.estado_pago).toBe("parcial");
    expect(result.payload.after?.producto).toBe("pastel");
    expect(result.payload.after?.folio).toBe("op-order-1");
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

    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-update-8",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      patch: { cantidad: 2 }
    });

    expect(result.ok).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(3);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createUpdateOrderTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-update-9",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        patch: { cantidad: 2 }
      })
    ).rejects.toThrow("order_update_gws_command_unavailable");
  });
});
