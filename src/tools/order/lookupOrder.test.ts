import { describe, expect, it, vi } from "vitest";

import { createLookupOrderTool } from "./lookupOrder";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

describe("lookup-order tool", () => {
  it("fails when spreadsheet id is missing", async () => {
    const tool = createLookupOrderTool({
      gwsRange: "Pedidos!A:R"
    });

    await expect(
      tool({ chat_id: "chat-1", query: "ana" })
    ).rejects.toThrow("order_lookup_gws_spreadsheet_id_missing");
  });

  it("returns matches for customer name", async () => {
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
      ["2026-03-07", "op-1", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "order-1", "2026-03-07T14:00:00"],
      ["2026-03-08", "op-2", "2026-03-08 10:00", "Luis", "", "pastel", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "order-2", "2026-03-08T10:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "ana" });
    expect(result.total).toBe(1);
    expect(result.orders[0]?.nombre_cliente).toBe("Ana");
    expect(result.trace_ref).toBe("order-lookup:ana:a1");
  });

  it("returns matches for folio and operation id", async () => {
    const rows = [
      ["2026-03-07", "op-abc-1", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "lookup-op-1", "2026-03-07T14:00:00"],
      ["2026-03-08", "op-def-2", "2026-03-08 10:00", "Luis", "", "pastel", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "lookup-op-2", "2026-03-08T10:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const byFolio = await tool({ chat_id: "chat-1", query: "op-abc-1" });
    expect(byFolio.total).toBe(1);
    expect(byFolio.orders[0]?.folio).toBe("op-abc-1");

    const byOperation = await tool({ chat_id: "chat-1", query: "lookup-op-2" });
    expect(byOperation.total).toBe(1);
    expect(byOperation.orders[0]?.operation_id).toBe("lookup-op-2");
  });

  it("returns empty when no match", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [] }));
    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "inexistente" });
    expect(result.total).toBe(0);
    expect(result.orders).toEqual([]);
    expect(result.trace_ref).toBe("order-lookup:inexistente:a1");
  });

  it("limits results to 10 by default and preserves total count", async () => {
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
        `order-${idx}`,
        `2026-03-${idx.toString().padStart(2, "0")}T10:00:00`
      ]);
    }

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "ana" });
    expect(result.total).toBe(12);
    expect(result.orders).toHaveLength(10);
    expect(result.orders[0]?.folio).toBe("op-12");
    expect(result.orders[9]?.folio).toBe("op-3");
  });

  it("prioritizes exact folio match before recency sort", async () => {
    const rows = [
      ["2026-03-09", "op-2026-main", "2026-03-09 10:00", "Ana", "", "cupcakes", "", "1", "", "", "recoger_en_tienda", "", "pagado", "100", "MXN", "", "chat-1", "order-main", "2026-03-09T10:00:00"],
      ["2026-03-10", "op-2026-main-v2", "2026-03-10 10:00", "Ana", "", "cupcakes", "", "1", "", "", "recoger_en_tienda", "", "pagado", "100", "MXN", "", "chat-1", "order-v2", "2026-03-10T10:00:00"]
    ];
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "op-2026-main" });
    expect(result.total).toBe(2);
    expect(result.orders[0]?.folio).toBe("op-2026-main");
    expect(result.orders[1]?.folio).toBe("op-2026-main-v2");
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

    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "ana" });
    expect(result.total).toBe(0);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "ana" })
    ).rejects.toThrow("order_lookup_gws_command_unavailable");
  });

  it("fails for noisy query without meaningful tokens", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [] }));
    const tool = createLookupOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:R",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "de del" })
    ).rejects.toThrow("order_lookup_query_invalid");
  });
});
