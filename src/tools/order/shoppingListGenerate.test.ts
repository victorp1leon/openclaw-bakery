import { describe, expect, it, vi } from "vitest";

import { createShoppingListGenerateTool } from "./shoppingListGenerate";

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
      "fecha_hora_entrega_iso"
    ],
    ["2026-03-07", "op-1", "2026-03-07 14:00", "Ana", "", "cupcakes clasicos", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-1", "2026-03-07T14:00:00"],
    ["2026-03-07", "op-2", "2026-03-08 09:00", "Luis", "", "pastel red velvet", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "op-2", "2026-03-08T09:00:00"],
    ["2026-03-14", "op-3", "2026-03-15 09:00", "Eva", "", "galletas avena", "", "20", "", "", "recoger_en_tienda", "", "pagado", "300", "MXN", "", "chat-1", "op-3", "2026-03-15T09:00:00"]
  ];
}

function buildRecipeRows(): string[][] {
  return [
    ["recipe_id", "aliases_csv", "insumo", "unidad", "cantidad_por_unidad", "activo"],
    ["cupcake", "cupcakes, cupcake clasico", "harina", "g", "50", "1"],
    ["cupcake", "cupcakes, cupcake clasico", "azucar", "g", "30", "1"],
    ["pastel", "pastel, cake", "harina", "g", "220", "1"],
    ["pastel", "pastel, cake", "betun", "g", "180", "1"]
  ];
}

describe("shopping-list-generate tool", () => {
  it("fails when spreadsheet id is missing", async () => {
    const tool = createShoppingListGenerateTool({
      gwsRange: "Pedidos!A:U"
    });

    await expect(
      tool({ chat_id: "chat-1", scope: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("shopping_list_gws_spreadsheet_id_missing");
  });

  it("filters orders by day, week and order reference", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: buildRows() }));
    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner,
      timezone: "America/Mexico_City"
    });

    const day = await tool({
      chat_id: "chat-1",
      scope: { type: "day", dateKey: "2026-03-08", label: "el 8 de marzo" }
    });
    const week = await tool({
      chat_id: "chat-1",
      scope: { type: "week", anchorDateKey: "2026-03-07", label: "esta semana" }
    });
    const ref = await tool({
      chat_id: "chat-1",
      scope: { type: "order_ref", reference: "op-3", label: "pedido op-3" }
    });

    expect(day.totalOrders).toBe(1);
    expect(day.orders[0]?.folio).toBe("op-2");
    expect(week.totalOrders).toBe(2);
    expect(week.orders.map((order) => order.folio)).toEqual(["op-1", "op-2"]);
    expect(ref.totalOrders).toBe(1);
    expect(ref.orders[0]?.folio).toBe("op-3");
  });

  it("matches lookup query accent-insensitive", async () => {
    const rows = [
      ...buildRows().slice(0, 1),
      ["2026-03-07", "op-accent", "2026-03-09 10:00", "Ána", "", "Pastel tres leches", "", "1", "", "", "recoger_en_tienda", "", "pagado", "800", "MXN", "", "chat-1", "op-accent", "2026-03-09T10:00:00"]
    ];
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({
      chat_id: "chat-1",
      scope: { type: "lookup", query: "ana tres", label: "\"ana tres\"" }
    });

    expect(result.totalOrders).toBe(1);
    expect(result.orders[0]?.folio).toBe("op-accent");
  });

  it("aggregates products and supplies with fallback assumptions", async () => {
    const rows = [
      ...buildRows().slice(0, 1),
      ["2026-03-07", "op-cup", "2026-03-07 14:00", "Ana", "", "cupcakes clasicos", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "op-cup", "2026-03-07T14:00:00"],
      ["2026-03-07", "op-unknown", "2026-03-07 18:00", "Leo", "", "mesa de postres", "", "2", "", "", "recoger_en_tienda", "", "pagado", "1000", "MXN", "", "chat-1", "op-unknown", "2026-03-07T18:00:00"]
    ];
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({
      chat_id: "chat-1",
      scope: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });

    expect(result.products.some((item) => item.product === "cupcakes clasicos" && item.quantity === 12)).toBe(true);
    expect(result.supplies.some((item) => item.item === "harina" && item.amount > 0)).toBe(true);
    expect(result.supplies.some((item) => item.item === "empaque_generico" && item.amount === 2)).toBe(true);
    expect(result.assumptions.some((item) => item.includes("sin receta mapeada"))).toBe(true);
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

    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner,
      maxRetries: 2,
      retryBackoffMs: 0
    });

    const result = await tool({
      chat_id: "chat-1",
      scope: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });
    expect(result.totalOrders).toBe(1);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", scope: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("shopping_list_gws_command_unavailable");
  });

  it("loads recipe profiles from gws catalog when source is gws", async () => {
    const gwsRunner = vi.fn().mockImplementation(async (args: { commandArgs: string[] }) => {
      const paramsIndex = args.commandArgs.indexOf("--params");
      const params = JSON.parse(args.commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range === "Pedidos!A:U") {
        return okJson({ values: buildRows() });
      }
      if (params.range === "CatalogoRecetas!A:F") {
        return okJson({ values: buildRecipeRows() });
      }
      return okJson({ values: [] });
    });

    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      recipeSource: "gws",
      recipesGwsRange: "CatalogoRecetas!A:F",
      gwsRunner
    });

    const result = await tool({
      chat_id: "chat-1",
      scope: { type: "day", dateKey: "2026-03-07", label: "hoy" }
    });

    expect(result.totalOrders).toBe(1);
    expect(result.supplies.some((item) => item.item === "harina" && item.amount === 600)).toBe(true);
    expect(result.supplies.some((item) => item.item === "azucar" && item.amount === 360)).toBe(true);
    expect(result.detail).toContain("recipe_source=gws");
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when recipe catalog is empty in gws mode", async () => {
    const gwsRunner = vi.fn().mockImplementation(async (args: { commandArgs: string[] }) => {
      const paramsIndex = args.commandArgs.indexOf("--params");
      const params = JSON.parse(args.commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range === "Pedidos!A:U") {
        return okJson({ values: buildRows() });
      }
      return okJson({ values: [] });
    });

    const tool = createShoppingListGenerateTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      recipeSource: "gws",
      recipesGwsRange: "CatalogoRecetas!A:F",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", scope: { type: "day", dateKey: "2026-03-07", label: "hoy" } })
    ).rejects.toThrow("shopping_list_recipes_catalog_empty");
  });
});
