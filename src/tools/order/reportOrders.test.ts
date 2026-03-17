import { describe, expect, it, vi } from "vitest";

import { createReportOrdersTool } from "./reportOrders";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

describe("report-orders tool", () => {
  it("fails when spreadsheet id is missing", async () => {
    const tool = createReportOrdersTool({
      gwsRange: "Pedidos!A:U"
    });

    await expect(
      tool({ chat_id: "chat-1", period: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("order_report_gws_spreadsheet_id_missing");
  });

  it("normalizes append-style range to read range", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [] }));
    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A1",
      gwsRunner,
      now: () => new Date("2026-03-07T12:00:00.000Z")
    });

    const result = await tool({ chat_id: "chat-1", period: { type: "day", dateKey: "2026-03-07", label: "hoy" } });
    expect(result.total).toBe(0);

    const call = gwsRunner.mock.calls[0]?.[0] as { commandArgs: string[] };
    const paramsIndex = call.commandArgs.indexOf("--params");
    const params = JSON.parse(call.commandArgs[paramsIndex + 1]) as { range: string };
    expect(params.range).toBe("Pedidos!A:U");
  });

  it("filters orders by day/week/month/year and sorts by recency desc", async () => {
    const rows = [
      [
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
      ],
      ["2026-03-07", "op-1", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-1", "2026-03-07T14:00:00", "activo", "card-1"],
      ["2026-03-07", "op-2", "2026-03-08 09:00", "Luis", "", "pastel", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "op-2", "2026-03-08T09:00:00", "activo", "card-2"],
      ["2026-03-14", "op-3", "2026-03-15 09:00", "Eva", "", "galletas", "", "20", "", "", "recoger_en_tienda", "", "pagado", "300", "MXN", "", "chat-1", "op-3", "2026-03-15T09:00:00", "cancelado", "card-3"],
      ["2026-04-01", "op-4", "2026-04-01 08:00", "Iris", "", "brownie", "", "6", "", "", "recoger_en_tienda", "", "pagado", "240", "MXN", "", "chat-1", "op-4", "2026-04-01T08:00:00", "activo", "card-4"],
      ["2025-12-31", "op-5", "2025-12-31 08:00", "Leo", "", "donas", "", "8", "", "", "recoger_en_tienda", "", "pagado", "160", "MXN", "", "chat-1", "op-5", "2025-12-31T08:00:00", "activo", "card-5"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner,
      timezone: "America/Mexico_City",
      now: () => new Date("2026-03-07T12:00:00.000Z")
    });

    const day = await tool({ chat_id: "chat-1", period: { type: "day", dateKey: "2026-03-08", label: "el 8 de marzo" } });
    const week = await tool({ chat_id: "chat-1", period: { type: "week", anchorDateKey: "2026-03-07", label: "esta semana" } });
    const nextWeek = await tool({ chat_id: "chat-1", period: { type: "week", anchorDateKey: "2026-03-14", label: "la siguiente semana" } });
    const month = await tool({ chat_id: "chat-1", period: { type: "month", year: 2026, month: 3, label: "este mes" } });
    const year = await tool({ chat_id: "chat-1", period: { type: "year", year: 2026, label: "este año" } });

    expect(day.total).toBe(1);
    expect(day.orders[0]?.folio).toBe("op-2");

    expect(week.total).toBe(2);
    expect(week.orders.map((order) => order.folio)).toEqual(["op-2", "op-1"]);

    expect(nextWeek.total).toBe(1);
    expect(nextWeek.orders[0]?.folio).toBe("op-3");

    expect(month.total).toBe(3);
    expect(month.orders.map((order) => order.folio)).toEqual(["op-3", "op-2", "op-1"]);

    expect(year.total).toBe(4);
    expect(year.orders.map((order) => order.folio)).toEqual(["op-4", "op-3", "op-2", "op-1"]);
    expect(year.orders[1]?.estado_pedido).toBe("cancelado");
    expect(year.trace_ref).toBe("report-orders:year-2026:a1");
  });

  it("uses fecha_hora_entrega_iso when free text field is relative", async () => {
    const rows = [
      [
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
      ],
      ["2026-03-07", "op-iso-1", "manana 2pm", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-iso-1", "2026-03-08T14:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner,
      timezone: "America/Mexico_City",
      now: () => new Date("2026-03-07T12:00:00.000Z")
    });

    const period = { type: "day", dateKey: "2026-03-08", label: "el 8 de marzo" } as const;
    const day = await tool({ chat_id: "chat-1", period });
    expect(day.total).toBe(1);
    expect(day.orders[0]?.folio).toBe("op-iso-1");
  });

  it("reports inconsistencies for rows with invalid delivery datetime", async () => {
    const rows = [
      [
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
      ],
      ["2026-03-07", "op-bad-1", "por definir", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-bad-1", ""],
      ["2026-03-07", "op-good-1", "2026-03-08 10:00", "Luis", "", "pastel", "", "1", "", "", "recoger_en_tienda", "", "pagado", "900", "MXN", "", "chat-1", "op-good-1", "2026-03-08T10:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({
      chat_id: "chat-1",
      period: { type: "day", dateKey: "2026-03-08", label: "el 8 de marzo" }
    });

    expect(result.total).toBe(1);
    expect(result.orders[0]?.folio).toBe("op-good-1");
    expect(result.inconsistencies).toHaveLength(1);
    expect(result.inconsistencies[0]).toEqual({
      reference: "op-bad-1",
      reason: "delivery_date_missing_or_invalid",
      detail: "por definir"
    });
  });

  it("applies default limit=10 and keeps total count", async () => {
    const rows: string[][] = [
      [
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
        "estado_pedido"
      ]
    ];

    for (let idx = 1; idx <= 12; idx += 1) {
      rows.push([
        "2026-03-07",
        `op-${idx}`,
        `2026-03-${idx.toString().padStart(2, "0")} 10:00`,
        "Ana",
        "",
        "cupcakes",
        "",
        "1",
        "",
        "",
        "recoger_en_tienda",
        "",
        "pagado",
        "100",
        "MXN",
        "",
        "chat-1",
        `operation-${idx}`,
        `2026-03-${idx.toString().padStart(2, "0")}T10:00:00`,
        "activo"
      ]);
    }

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({
      chat_id: "chat-1",
      period: { type: "month", year: 2026, month: 3, label: "marzo" }
    });

    expect(result.total).toBe(12);
    expect(result.orders).toHaveLength(10);
    expect(result.orders[0]?.folio).toBe("op-12");
    expect(result.orders[9]?.folio).toBe("op-3");
  });

  it("maps estado_pedido with fallback indexes when header is absent", async () => {
    const rows = [
      ["2026-03-07", "op-idx-1", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-idx-1", "2026-03-07T14:00:00", "cancelado", "card-1"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", period: { type: "day", dateKey: "2026-03-07", label: "hoy" } });
    expect(result.total).toBe(1);
    expect(result.orders[0]?.estado_pedido).toBe("cancelado");
  });

  it("retries on transient gws timeout and then succeeds", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: null,
        signal: "SIGKILL",
        stdout: "",
        stderr: "timed out",
        timedOut: true
      })
      .mockResolvedValueOnce(okJson({ values: [] }));

    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner,
      now: () => new Date("2026-03-07T12:00:00.000Z")
    });

    const result = await tool({ chat_id: "chat-1", period: { type: "day", dateKey: "2026-03-07", label: "hoy" } });
    expect(result.total).toBe(0);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createReportOrdersTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner,
      now: () => new Date("2026-03-07T12:00:00.000Z")
    });

    await expect(
      tool({ chat_id: "chat-1", period: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("order_report_gws_command_unavailable");
  });
});
