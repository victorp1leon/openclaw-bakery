import { describe, expect, it, vi } from "vitest";

import { createScheduleDayViewTool } from "./scheduleDayView";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

function buildRows(): string[][] {
  return [
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
    ],
    ["2026-03-07", "op-1", "2026-03-07 14:00", "Ana", "", "cupcakes clasicos", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-1", "2026-03-07T14:00:00", "activo"],
    ["2026-03-07", "op-2", "2026-03-07 18:00", "Luis", "", "pastel red velvet", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "op-2", "2026-03-07T18:00:00", "activo"],
    ["2026-03-07", "op-3", "2026-03-07 20:00", "Eva", "", "galletas", "", "20", "", "", "recoger_en_tienda", "", "pagado", "300", "MXN", "[CANCELADO] cliente aviso", "chat-1", "op-3", "2026-03-07T20:00:00", ""],
    ["2026-03-07", "op-4", "2026-03-08 09:00", "Iris", "", "mesa de postres", "", "2", "", "", "recoger_en_tienda", "", "pagado", "1200", "MXN", "", "chat-1", "op-4", "2026-03-08T09:00:00", "activo"]
  ];
}

function buildRecipeRows(): string[][] {
  return [
    ["recipe_id", "aliases_csv", "insumo", "unidad", "cantidad_por_unidad", "activo"],
    ["pastel", "pastel, cake", "harina", "g", "220", "1"],
    ["pastel", "pastel, cake", "betun", "g", "180", "1"]
  ];
}

describe("schedule-day-view tool", () => {
  it("fails when spreadsheet id is missing", async () => {
    const tool = createScheduleDayViewTool({
      gwsRange: "Pedidos!A:T"
    });

    await expect(
      tool({ chat_id: "chat-1", day: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("schedule_day_view_gws_spreadsheet_id_missing");
  });

  it("filters orders for exact day and ignores canceled rows", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: buildRows() }));
    const tool = createScheduleDayViewTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:T",
      gwsRunner,
      timezone: "America/Mexico_City"
    });

    const result = await tool({
      chat_id: "chat-1",
      day: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });

    expect(result.totalOrders).toBe(2);
    expect(result.deliveries.map((item) => item.folio)).toEqual(["op-1", "op-2"]);
    expect(result.inconsistencies).toHaveLength(0);
  });

  it("excludes rows without ISO and reports inconsistencies", async () => {
    const rows = [
      ...buildRows().slice(0, 1),
      ["2026-03-07", "op-no-iso", "2026-03-07 10:00", "Ana", "", "pastel", "", "1", "", "", "recoger_en_tienda", "", "pagado", "500", "MXN", "", "chat-1", "op-no-iso", "", "activo"],
      ["2026-03-07", "op-ok", "2026-03-07 12:00", "Luis", "", "cupcakes", "", "6", "", "", "recoger_en_tienda", "", "pagado", "240", "MXN", "", "chat-1", "op-ok", "2026-03-07T12:00:00", "activo"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createScheduleDayViewTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:T",
      gwsRunner,
      timezone: "America/Mexico_City"
    });

    const result = await tool({
      chat_id: "chat-1",
      day: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });

    expect(result.totalOrders).toBe(1);
    expect(result.deliveries[0]?.folio).toBe("op-ok");
    expect(result.inconsistencies.some((item) => item.reference === "op-no-iso" && item.reason === "delivery_iso_missing_or_invalid")).toBe(true);
  });

  it("keeps invalid quantity in deliveries but excludes it from preparation and purchases", async () => {
    const rows = [
      ...buildRows().slice(0, 1),
      ["2026-03-07", "op-bad-qty", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-bad-qty", "2026-03-07T14:00:00", "activo"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createScheduleDayViewTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:T",
      gwsRunner,
      timezone: "America/Mexico_City"
    });

    const result = await tool({
      chat_id: "chat-1",
      day: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });

    expect(result.totalOrders).toBe(1);
    expect(result.deliveries[0]?.cantidad_invalida).toBe(true);
    expect(result.preparation).toHaveLength(0);
    expect(result.suggestedPurchases).toHaveLength(0);
    expect(result.inconsistencies.some((item) => item.reference === "op-bad-qty" && item.reason === "quantity_invalid")).toBe(true);
  });

  it("builds suggested purchases with catalog source and inline fallback", async () => {
    const gwsRunner = vi.fn().mockImplementation(async (args: { commandArgs: string[] }) => {
      const paramsIndex = args.commandArgs.indexOf("--params");
      const params = JSON.parse(args.commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range === "Pedidos!A:T") {
        return okJson({ values: buildRows() });
      }
      if (params.range === "CatalogoRecetas!A:F") {
        return okJson({ values: buildRecipeRows() });
      }
      return okJson({ values: [] });
    });

    const tool = createScheduleDayViewTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:T",
      recipeSource: "gws",
      recipesGwsRange: "CatalogoRecetas!A:F",
      gwsRunner,
      timezone: "America/Mexico_City"
    });

    const result = await tool({
      chat_id: "chat-1",
      day: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });

    expect(result.suggestedPurchases.some((item) => item.source === "catalog")).toBe(true);
    expect(result.suggestedPurchases.some((item) => item.source === "inline")).toBe(true);
    expect(result.assumptions.some((item) => item.includes("fallback inline"))).toBe(true);
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
      .mockResolvedValueOnce(okJson({ values: buildRows() }));

    const tool = createScheduleDayViewTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:T",
      gwsRunner,
      maxRetries: 2,
      retryBackoffMs: 0
    });

    const result = await tool({
      chat_id: "chat-1",
      day: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });
    expect(result.totalOrders).toBe(2);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createScheduleDayViewTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:T",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", day: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("schedule_day_view_gws_command_unavailable");
  });
});
