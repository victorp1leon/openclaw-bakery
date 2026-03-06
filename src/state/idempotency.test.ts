import { describe, expect, it } from "vitest";

import { buildIdempotencyKey } from "./idempotency";

describe("buildIdempotencyKey", () => {
  it("genera misma llave para payload equivalente en mismo bucket", () => {
    const ts = Date.parse("2026-02-19T12:00:00.000Z");
    const k1 = buildIdempotencyKey({
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      timestampMs: ts
    });

    const k2 = buildIdempotencyKey({
      chat_id: "chat-1",
      intent: "gasto",
      payload: { concepto: "harina", monto: 380 },
      timestampMs: ts + 2 * 60 * 1000
    });

    expect(k1).toBe(k2);
  });

  it("cambia llave cuando cambia bucket de tiempo", () => {
    const ts = Date.parse("2026-02-19T12:00:00.000Z");
    const k1 = buildIdempotencyKey({
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      timestampMs: ts
    });

    const k2 = buildIdempotencyKey({
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      timestampMs: ts + 11 * 60 * 1000
    });

    expect(k1).not.toBe(k2);
  });
});
