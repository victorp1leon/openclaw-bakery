import { describe, expect, it } from "vitest";

import { pickOneMissing } from "./missingFieldPicker";

describe("missingFieldPicker", () => {
  it("returns undefined when there are no missing fields", () => {
    expect(pickOneMissing([])).toBeUndefined();
  });

  it("returns the first missing field by default", () => {
    expect(pickOneMissing(["monto", "concepto"])).toBe("monto");
  });

  it("returns the next field after already asked when possible", () => {
    expect(pickOneMissing(["monto", "concepto", "fecha"], "monto")).toBe("concepto");
  });
});

