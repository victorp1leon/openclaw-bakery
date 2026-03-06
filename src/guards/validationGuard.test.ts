import { z } from "zod";
import { describe, expect, it } from "vitest";

import { validateWith } from "./validationGuard";

const DraftExpenseSchema = z.object({
  monto: z.number().positive(),
  concepto: z.string().min(1)
});

describe("validationGuard", () => {
  it("returns ok for valid payload", () => {
    const result = validateWith(DraftExpenseSchema, { monto: 380, concepto: "harina" });
    expect(result.ok).toBe(true);
  });

  it("returns missing fields when payload is incomplete", () => {
    const result = validateWith(DraftExpenseSchema, { concepto: "harina" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("monto");
    }
  });

  it("returns validation message for invalid values", () => {
    const result = validateWith(DraftExpenseSchema, { monto: -1, concepto: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

