import { describe, expect, it } from "vitest";

import { ExpenseSchema } from "./expense";

describe("ExpenseSchema", () => {
  it("acepta payload mínimo y aplica moneda default", () => {
    const parsed = ExpenseSchema.parse({ monto: 380, concepto: "harina" });

    expect(parsed.moneda).toBe("MXN");
    expect(parsed.monto).toBe(380);
    expect(parsed.concepto).toBe("harina");
  });

  it("rechaza monto no positivo", () => {
    const result = ExpenseSchema.safeParse({ monto: 0, concepto: "harina" });
    expect(result.success).toBe(false);
  });
});
