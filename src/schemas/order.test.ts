import { describe, expect, it } from "vitest";

import { OrderSchema } from "./order";

describe("OrderSchema", () => {
  it("requiere direccion cuando tipo_envio=envio_domicilio", () => {
    const result = OrderSchema.safeParse({
      nombre_cliente: "Ana",
      producto: "pastel",
      cantidad: 1,
      tipo_envio: "envio_domicilio",
      fecha_hora_entrega: "2026-02-20T14:00:00"
    });

    expect(result.success).toBe(false);
  });

  it("acepta recoger_en_tienda sin direccion", () => {
    const result = OrderSchema.safeParse({
      nombre_cliente: "Ana",
      producto: "pastel",
      cantidad: 1,
      tipo_envio: "recoger_en_tienda",
      fecha_hora_entrega: "2026-02-20T14:00:00"
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moneda).toBe("MXN");
    }
  });
});
