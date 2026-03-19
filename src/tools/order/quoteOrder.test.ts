import { describe, expect, it, vi } from "vitest";

import { createQuoteOrderTool } from "./quoteOrder";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

describe("quote-order tool", () => {
  it("fails when spreadsheet id is missing", async () => {
    const tool = createQuoteOrderTool();

    await expect(
      tool({ chat_id: "chat-1", query: "cotiza pastel mediano" })
    ).rejects.toThrow("quote_order_gws_spreadsheet_id_missing");
  });

  it("calculates quote from base + options + extras + shipping + urgency", async () => {
    const pricingRows = [
      [
        "tipo",
        "clave",
        "nombre",
        "monto_mxn",
        "modo_calculo",
        "aplica_a",
        "cantidad_min",
        "cantidad_max",
        "horas_max_anticipacion",
        "zona",
        "activo",
        "notas",
        "actualizado_en"
      ],
      ["PRODUCTO", "pastel_mediano", "Pastel mediano", "650", "fijo", "todo", "", "", "", "", "1", "", "2026-03-12T00:00:00.000Z"],
      ["EXTRA", "topper_personalizado", "Topper personalizado", "80", "fijo", "pedido", "", "", "", "", "1", "", "2026-03-12T00:00:00.000Z"],
      ["ENVIO", "zona_villa_alvarez", "Envio Villa de Alvarez", "70", "fijo", "envio_domicilio", "", "", "", "Villa de Alvarez", "1", "", "2026-03-12T00:00:00.000Z"],
      ["URGENCIA", "urgencia_24h", "Recargo urgencia <24h", "35", "porcentaje", "pedido", "", "", "24", "", "1", "", "2026-03-12T00:00:00.000Z"],
      ["POLITICA", "anticipo_default", "Anticipo sugerido", "50", "porcentaje", "pedido", "", "", "", "", "1", "", "2026-03-12T00:00:00.000Z"],
      ["POLITICA", "vigencia_cotizacion_horas", "Vigencia cotizacion", "72", "horas", "cotizacion", "", "", "", "", "1", "", "2026-03-12T00:00:00.000Z"]
    ];

    const optionRows = [
      ["categoria", "clave", "nombre", "precio_extra_mxn", "modo_calculo", "aplica_a", "activo", "notas"],
      ["SABOR_PAN", "pan_vainilla", "Vainilla", "0", "fijo", "pasteles", "1", ""],
      ["RELLENO", "relleno_oreo", "Oreo", "0", "fijo", "pasteles", "1", ""],
      ["TIPO_BETUN", "betun_buttercream", "Buttercream", "0", "fijo", "pasteles", "1", ""],
      ["TOPPING", "topping_fresas", "Fresas", "0", "fijo", "pasteles", "1", ""],
      ["EXTRA", "decoracion_personalizada", "Decoracion personalizada", "$120 MXN", "fijo", "pasteles", "1", ""]
    ];

    const referenceRows = [
      ["fuente", "ciudad", "item", "precio_mxn", "porciones/tamano", "url", "fecha_consulta"],
      ["instagram", "Colima", "Pastel mediano", "780", "8-12", "https://example.com/1", "2026-03-12"],
      ["facebook", "Colima", "Pastel mediano", "820", "8-12", "https://example.com/2", "2026-03-11"]
    ];

    const gwsRunner = vi.fn(async ({ commandArgs }: { commandArgs: string[] }) => {
      const paramsIndex = commandArgs.indexOf("--params");
      const params = JSON.parse(commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range.startsWith("CatalogoPrecios")) return okJson({ values: pricingRows });
      if (params.range.startsWith("CatalogoOpciones")) return okJson({ values: optionRows });
      if (params.range.startsWith("CatalogoReferencias")) return okJson({ values: referenceRows });
      return okJson({ values: [] });
    });

    const tool = createQuoteOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRunner,
      now: () => new Date("2026-03-12T12:00:00.000Z")
    });

    const result = await tool({
      chat_id: "chat-1",
      query: "cotiza pastel mediano con decoracion personalizada y topper personalizado, envio a domicilio en villa de alvarez para hoy"
    });

    expect(result.product.key).toBe("pastel_mediano");
    expect(result.quantity).toBe(1);
    expect(result.subtotal).toBe(920);
    expect(result.total).toBe(1242);
    expect(result.suggestedDeposit).toBe(621);
    expect(result.quoteValidityHours).toBe(72);
    expect(result.lines.map((line) => [line.kind, line.key, line.amount])).toEqual([
      ["base", "pastel_mediano", 650],
      ["option", "decoracion_personalizada", 120],
      ["extra", "topper_personalizado", 80],
      ["shipping", "zona_villa_alvarez", 70],
      ["urgency", "urgencia_24h", 322]
    ]);
    expect(result.referenceContext).toEqual({
      matched: 2,
      averagePrice: 800
    });
    expect(result.optionSuggestions).toEqual({
      quote_sabor_pan: ["Vainilla"],
      quote_sabor_relleno: ["Oreo"],
      quote_tipo_betun: ["Buttercream"],
      quote_topping: ["Fresas"]
    });
    expect(gwsRunner).toHaveBeenCalledTimes(3);
  });

  it("fails when no product can be matched from catalog", async () => {
    const gwsRunner = vi.fn(async ({ commandArgs }: { commandArgs: string[] }) => {
      const paramsIndex = commandArgs.indexOf("--params");
      const params = JSON.parse(commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range.startsWith("CatalogoPrecios")) {
        return okJson({
          values: [
            ["tipo", "clave", "nombre", "monto_mxn", "modo_calculo", "aplica_a", "cantidad_min", "cantidad_max", "horas_max_anticipacion", "zona", "activo", "notas", "actualizado_en"],
            ["PRODUCTO", "pastel_mediano", "Pastel mediano", "650", "fijo", "todo", "", "", "", "", "1", "", "2026-03-12T00:00:00.000Z"]
          ]
        });
      }
      return okJson({ values: [] });
    });

    const tool = createQuoteOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "cotiza macarons para 20 personas" })
    ).rejects.toThrow("quote_order_product_not_found");
  });

  it("fails when home delivery quote does not include a recognized shipping zone", async () => {
    const pricingRows = [
      ["tipo", "clave", "nombre", "monto_mxn", "modo_calculo", "aplica_a", "cantidad_min", "cantidad_max", "horas_max_anticipacion", "zona", "activo"],
      ["PRODUCTO", "pastel_mediano", "Pastel mediano", "650", "fijo", "todo", "", "", "", "", "1"],
      ["ENVIO", "zona_villa_alvarez", "Envio Villa de Alvarez", "70", "fijo", "envio_domicilio", "", "", "", "Villa de Alvarez", "1"],
      ["ENVIO", "zona_colima_centro", "Envio Colima Centro", "60", "fijo", "envio_domicilio", "", "", "", "Colima Centro", "1"]
    ];

    const gwsRunner = vi.fn(async ({ commandArgs }: { commandArgs: string[] }) => {
      const paramsIndex = commandArgs.indexOf("--params");
      const params = JSON.parse(commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range.startsWith("CatalogoPrecios")) return okJson({ values: pricingRows });
      return okJson({ values: [] });
    });

    const tool = createQuoteOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "cotiza pastel mediano x1 envio a domicilio para mañana" })
    ).rejects.toThrow("quote_order_shipping_zone_missing");
  });

  it("fails when modifier matching is ambiguous and requires clarification", async () => {
    const pricingRows = [
      ["tipo", "clave", "nombre", "monto_mxn", "modo_calculo", "aplica_a", "cantidad_min", "cantidad_max", "horas_max_anticipacion", "zona", "activo"],
      ["PRODUCTO", "pastel_mediano", "Pastel mediano", "650", "fijo", "todo", "", "", "", "", "1"],
      ["EXTRA", "decoracion_personalizada", "Decoracion personalizada", "120", "fijo", "pedido", "", "", "", "", "1"]
    ];

    const gwsRunner = vi.fn(async ({ commandArgs }: { commandArgs: string[] }) => {
      const paramsIndex = commandArgs.indexOf("--params");
      const params = JSON.parse(commandArgs[paramsIndex + 1]) as { range: string };
      if (params.range.startsWith("CatalogoPrecios")) return okJson({ values: pricingRows });
      return okJson({ values: [] });
    });

    const tool = createQuoteOrderTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "cotiza pastel mediano x1 recoger en tienda personalizada decoracion" })
    ).rejects.toThrow("quote_order_modifier_ambiguous");
  });
});
