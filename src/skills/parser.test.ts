import { describe, expect, it } from "vitest";

import { parseExpense, parseOrder } from "./parser";

describe("parseExpense heuristic fallback", () => {
  it("extrae monto y concepto en frase natural", async () => {
    const runtime = {
      completeJson: async () => {
        throw new Error("openclaw_down");
      }
    };

    const parsed = await parseExpense("agrega un gasto de harina de 380 pesos", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("fallback");
      expect(parsed.payload.monto).toBe(380);
      expect(parsed.payload.concepto).toBe("harina");
    }
  });

  it("mantiene compatibilidad con formato corto", async () => {
    const runtime = {
      completeJson: async () => {
        throw new Error("openclaw_down");
      }
    };

    const parsed = await parseExpense("gasto 380 harina y azucar", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("fallback");
      expect(parsed.payload.monto).toBe(380);
      expect(parsed.payload.concepto).toBe("harina y azucar");
    }
  });

  it("prioriza el monto junto a moneda sobre cantidades del concepto", async () => {
    const runtime = {
      completeJson: async () => {
        throw new Error("openclaw_down");
      }
    };

    const parsed = await parseExpense("agrega el siguiente gasto de 1kilo de harina por 190 pesos", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("fallback");
      expect(parsed.payload.monto).toBe(190);
      expect(parsed.payload.concepto).toBe("1 kilo harina");
    }
  });

  it("en modo estricto no usa fallback cuando OpenClaw falla", async () => {
    const prev = process.env.OPENCLAW_STRICT;
    process.env.OPENCLAW_STRICT = "1";

    try {
      const runtime = {
        completeJson: async () => {
          throw new Error("openclaw_down");
        }
      };

      const parsed = await parseExpense("agrega un gasto de harina de 380 pesos", runtime);
      expect(parsed.ok).toBe(false);

      if (!parsed.ok) {
        expect(parsed.source).toBe("openclaw");
        expect(parsed.error).toContain("openclaw_down");
      }
    } finally {
      if (prev == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prev;
    }
  });

  it("extrae payload cuando viene dentro de payloads[].text del sobre OpenClaw", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{ text: "{\"payload\":{\"monto\":300,\"concepto\":\"harina\"}}" }]
      })
    };

    const parsed = await parseExpense("agrega un gasto de harina de 300 pesos", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("openclaw");
      expect(parsed.payload.monto).toBe(300);
      expect(parsed.payload.concepto).toBe("harina");
    }
  });

  it("completa faltantes con heurística cuando OpenClaw devuelve payload parcial", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{ text: "{\"payload\":{\"moneda\":\"MXN\"}}" }]
      })
    };

    const parsed = await parseExpense("agrega el siguiente gasto de 1kilo de harina por 190 pesos", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("openclaw");
      expect(parsed.payload.moneda).toBe("MXN");
      expect(parsed.payload.monto).toBe(190);
      expect(parsed.payload.concepto).toBe("1 kilo harina");
    }
  });

  it("normaliza moneda y elimina opcionales inventados/no evidenciados", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{
          text: JSON.stringify({
            payload: {
              monto: 190,
              concepto: "1 kilo de harina",
              moneda: "pesos",
              categoria: "insumos",
              metodo_pago: "efectivo",
              proveedor: "",
              fecha: "2023-11-17",
              notas: ""
            }
          })
        }]
      })
    };

    const parsed = await parseExpense("agrega el siguiente gasto de 1kilo de harina por 190 pesos", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("openclaw");
      expect(parsed.payload.monto).toBe(190);
      expect(parsed.payload.concepto).toBe("1 kilo de harina");
      expect(parsed.payload.moneda).toBe("MXN");
      expect(parsed.payload.categoria).toBeUndefined();
      expect(parsed.payload.metodo_pago).toBeUndefined();
      expect(parsed.payload.proveedor).toBeUndefined();
      expect(parsed.payload.fecha).toBeUndefined();
      expect(parsed.payload.notas).toBeUndefined();
    }
  });

  it("en modo estricto reporta payload no-JSON de OpenClaw", async () => {
    const prev = process.env.OPENCLAW_STRICT;
    process.env.OPENCLAW_STRICT = "1";

    try {
      const runtime = {
        completeJson: async () => ({
          payloads: [{ text: "⚠️ API rate limit reached. Please try again later." }]
        })
      };

      const parsed = await parseExpense("agrega un gasto de harina de 300 pesos", runtime);
      expect(parsed.ok).toBe(false);

      if (!parsed.ok) {
        expect(parsed.source).toBe("openclaw");
        expect(parsed.error).toContain("openclaw_non_json_payload");
        expect(parsed.error).toContain("rate limit");
      }
    } finally {
      if (prev == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prev;
    }
  });

  it("en modo estricto con softfail usa fallback ante abortos/transientes", async () => {
    const prevStrict = process.env.OPENCLAW_STRICT;
    const prevSoftfail = process.env.OPENCLAW_STRICT_SOFTFAIL;
    process.env.OPENCLAW_STRICT = "1";
    process.env.OPENCLAW_STRICT_SOFTFAIL = "1";

    try {
      const runtime = {
        completeJson: async () => ({
          payloads: [{ text: "Request timed out before a response was generated." }]
        })
      };

      const parsed = await parseExpense("agrega un gasto de harina de 300 pesos", runtime);
      expect(parsed.ok).toBe(true);

      if (parsed.ok) {
        expect(parsed.source).toBe("fallback");
        expect(parsed.payload.monto).toBe(300);
        expect(parsed.payload.concepto).toBe("harina");
      }
    } finally {
      if (prevStrict == null) delete process.env.OPENCLAW_STRICT;
      else process.env.OPENCLAW_STRICT = prevStrict;
      if (prevSoftfail == null) delete process.env.OPENCLAW_STRICT_SOFTFAIL;
      else process.env.OPENCLAW_STRICT_SOFTFAIL = prevSoftfail;
    }
  });
});

describe("parseOrder hardening", () => {
  it("completa faltantes con heurística cuando OpenClaw devuelve payload parcial", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{ text: "{\"payload\":{\"nombre_cliente\":\"Victor\"}}" }]
      })
    };

    const parsed = await parseOrder(
      "pedido Victor 12 cupcakes recoger pagado total: 480 entrega: 2026-02-20 14:00",
      runtime
    );
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("openclaw");
      expect(parsed.payload.nombre_cliente).toBe("Victor");
      expect(parsed.payload.cantidad).toBe(12);
      expect(parsed.payload.tipo_envio).toBe("recoger_en_tienda");
      expect(parsed.payload.estado_pago).toBe("pagado");
      expect(parsed.payload.total).toBe(480);
      expect(parsed.payload.fecha_hora_entrega).toContain("2026-02-20");
    }
  });

  it("elimina opcionales inventados y normaliza moneda en pedido", async () => {
    const runtime = {
      completeJson: async () => ({
        payloads: [{
          text: JSON.stringify({
            payload: {
              nombre_cliente: "Victor",
              producto: "cupcakes",
              cantidad: 12,
              tipo_envio: "recoger_en_tienda",
              fecha_hora_entrega: "2026-02-20 14:00",
              moneda: "pesos",
              estado_pago: "pagado",
              telefono: "",
              notas: "",
              direccion: "Calle 123"
            }
          })
        }]
      })
    };

    const parsed = await parseOrder("pedido Victor 12 cupcakes recoger", runtime);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.source).toBe("openclaw");
      expect(parsed.payload.moneda).toBeUndefined();
      expect(parsed.payload.estado_pago).toBeUndefined();
      expect(parsed.payload.telefono).toBeUndefined();
      expect(parsed.payload.notas).toBeUndefined();
      expect(parsed.payload.direccion).toBeUndefined();
      expect(parsed.payload.fecha_hora_entrega).toBeUndefined();
    }
  });
});
