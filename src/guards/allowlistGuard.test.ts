import { describe, expect, it } from "vitest";

import { isAllowedChat, parseAllowedChatIds } from "./allowlistGuard";

describe("allowlistGuard", () => {
  it("parses comma-separated allowlist values with trimming", () => {
    const parsed = parseAllowedChatIds(" 123 , 456,789 ");
    expect([...parsed]).toEqual(["123", "456", "789"]);
  });

  it("ignores empty entries and whitespace-only values", () => {
    const parsed = parseAllowedChatIds("123, , ,456,,");
    expect([...parsed]).toEqual(["123", "456"]);
  });

  it("returns false for non-allowed chat ids", () => {
    const allowed = new Set(["chat-1", "chat-2"]);
    expect(isAllowedChat("chat-3", allowed)).toBe(false);
  });
});

