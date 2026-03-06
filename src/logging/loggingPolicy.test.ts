import { describe, expect, it } from "vitest";

import { buildTextPreview, DEFAULT_TEXT_PREVIEW_MAX_LENGTH, REQUIRED_REDACTION_PATHS } from "./loggingPolicy";

describe("logging policy", () => {
  it("keeps required redaction keys", () => {
    expect(REQUIRED_REDACTION_PATHS).toEqual(
      expect.arrayContaining(["*.token", "*.secret", "*.botToken", "*.apiKey", "headers.authorization"])
    );
  });

  it("normalizes whitespace and truncates inbound text preview", () => {
    const raw = "hola\n\nquiero \t hacer un pedido " + "x".repeat(200);
    const preview = buildTextPreview(raw);

    expect(preview.includes("\n")).toBe(false);
    expect(preview.includes("\t")).toBe(false);
    expect(preview.length).toBe(DEFAULT_TEXT_PREVIEW_MAX_LENGTH);
  });

  it("returns full text when below max length", () => {
    expect(buildTextPreview("hola mundo")).toBe("hola mundo");
  });
});

