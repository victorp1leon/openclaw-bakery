import { describe, expect, it } from "vitest";

import { isCancel, isConfirm } from "./confirmationGuard";

describe("confirmationGuard", () => {
  it("detects confirmar with normalization", () => {
    expect(isConfirm("  Confirmar  ")).toBe(true);
  });

  it("detects cancelar with normalization", () => {
    expect(isCancel("  cancelar ")).toBe(true);
  });

  it("ignores non-control text", () => {
    expect(isConfirm("si, hazlo")).toBe(false);
    expect(isCancel("despues")).toBe(false);
  });
});

