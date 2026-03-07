import { describe, expect, it } from "vitest";

import { isCancel, isConfirm } from "./confirmationGuard";

describe("confirmationGuard", () => {
  it("detects confirmar with normalization", () => {
    expect(isConfirm("  Confirmar  ")).toBe(true);
  });

  it("detects confirmation synonyms", () => {
    expect(isConfirm("sí")).toBe(true);
    expect(isConfirm("ok")).toBe(true);
  });

  it("detects cancelar with normalization", () => {
    expect(isCancel("  cancelar ")).toBe(true);
  });

  it("detects cancel synonyms", () => {
    expect(isCancel("no")).toBe(true);
    expect(isCancel("stop")).toBe(true);
  });

  it("ignores non-control text", () => {
    expect(isConfirm("si, hazlo")).toBe(false);
    expect(isCancel("despues")).toBe(false);
    expect(isCancel("no gracias")).toBe(false);
  });
});
