import { describe, expect, it, vi } from "vitest";

import { createRecordPaymentTool } from "./recordPayment";

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

describe("record-payment tool", () => {
  it("fails when reference is missing", async () => {
    const tool = createRecordPaymentTool();

    await expect(
      tool({
        operation_id: "op-pay-1",
        chat_id: "chat-1",
        reference: {},
        payment: { estado_pago: "pagado", monto: 300 }
      })
    ).rejects.toThrow("payment_record_reference_missing");
  });

  it("fails when estado_pago is invalid", async () => {
    const tool = createRecordPaymentTool();

    await expect(
      tool({
        operation_id: "op-pay-2",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        payment: { monto: 300 }
      })
    ).rejects.toThrow("payment_record_estado_pago_invalid");
  });

  it("fails when monto is non-positive", async () => {
    const tool = createRecordPaymentTool();

    await expect(
      tool({
        operation_id: "op-pay-3",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        payment: { estado_pago: "parcial", monto: 0 }
      })
    ).rejects.toThrow("payment_record_monto_invalid");
  });

  it("fails when order is not found", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), buildRow()] }));
    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-pay-4",
        chat_id: "chat-1",
        reference: { folio: "op-missing" },
        payment: { estado_pago: "pagado", monto: 100 }
      })
    ).rejects.toThrow("payment_record_not_found");
  });

  it("fails when order reference is ambiguous", async () => {
    const rows = [buildHeader(), buildRow(), buildRow({ 17: "op-create-2" })];
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-pay-5",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        payment: { estado_pago: "pagado", monto: 100 }
      })
    ).rejects.toThrow("payment_record_reference_ambiguous");
  });

  it("rejects payment mutation for canceled order", async () => {
    const row = buildRow({
      15: "nota previa | [CANCELADO] 2026-03-10 op:abc chat:chat-1 motivo:n/a",
      19: "cancelado"
    });
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), row] }));
    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-pay-6",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        payment: { estado_pago: "pagado", monto: 100 }
      })
    ).rejects.toThrow("payment_record_order_canceled");
  });

  it("updates estado_pago and appends payment event", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce(okJson({ values: [buildHeader(), buildRow()] }))
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:R2" }));

    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      now: () => new Date("2026-03-11T12:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-pay-7",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      payment: {
        estado_pago: "parcial",
        monto: 350,
        metodo: "transferencia",
        notas: "anticipo"
      }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.before.estado_pago).toBe("pendiente");
    expect(result.payload.after.estado_pago).toBe("parcial");
    expect(result.payload.payment_event).toContain("[PAGO]");
    expect(result.payload.payment_event).toContain("op:op-pay-7");
    expect(result.payload.payment_event).toContain("estado:parcial");
    expect(result.payload.payment_event).toContain("monto:350");
    expect(result.payload.payment_event).toContain("metodo:transferencia");
    expect(result.payload.payment_event).toContain("nota:anticipo");

    const writeCallArgs = gwsRunner.mock.calls[1]?.[0];
    const jsonArgIdx = writeCallArgs.commandArgs.indexOf("--json");
    const body = JSON.parse(writeCallArgs.commandArgs[jsonArgIdx + 1]);
    expect(body.values[0][12]).toBe("parcial");
    const notes = String(body.values[0][15] ?? "");
    expect(notes).toContain("nota inicial");
    expect(notes).toContain("[PAGO]");
    expect(notes).toContain("op:op-pay-7");
  });

  it("avoids duplicating payment event when same operation is retried", async () => {
    const row = buildRow({
      12: "pagado",
      15: "nota inicial\n[PAGO] 2026-03-11T12:00:00.000Z op:op-pay-8 estado:pagado monto:500 metodo:transferencia nota:anticipo"
    });
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [buildHeader(), row] }));
    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-pay-8",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      payment: {
        estado_pago: "pagado",
        monto: 500,
        metodo: "transferencia",
        notas: "anticipo"
      }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.already_recorded).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(1);
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
      .mockResolvedValueOnce(okJson({ updatedRange: "Pedidos!A2:R2" }));

    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({
      operation_id: "op-pay-9",
      chat_id: "chat-1",
      reference: { folio: "op-order-1" },
      payment: { estado_pago: "pagado", monto: 100 }
    });

    expect(result.ok).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(3);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createRecordPaymentTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-pay-10",
        chat_id: "chat-1",
        reference: { folio: "op-order-1" },
        payment: { estado_pago: "pagado", monto: 100 }
      })
    ).rejects.toThrow("payment_record_gws_command_unavailable");
  });
});
