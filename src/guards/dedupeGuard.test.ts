import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dbPath = path.join(os.tmpdir(), `openclaw-dedupe-${Date.now()}-${Math.random()}.db`);
process.env.BOT_DB_PATH = dbPath;

let registerPendingWithDedupe: (args: {
  operation_id: string;
  chat_id: string;
  intent: "gasto" | "pedido";
  payload: unknown;
  timestampMs?: number;
}) =>
  | { ok: true; idempotency_key: string }
  | { ok: false; duplicate_of: { operation_id: string; status: string } };

let closeDatabase: () => void;

beforeAll(async () => {
  const dedupe = await import("./dedupeGuard");
  const db = await import("../state/database");
  registerPendingWithDedupe = dedupe.registerPendingWithDedupe;
  closeDatabase = db.closeDatabase;
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dbPath, { force: true });
});

describe("dedupeGuard", () => {
  it("returns idempotency key for new pending operation", () => {
    const result = registerPendingWithDedupe({
      operation_id: "op-dedupe-1",
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      timestampMs: Date.parse("2026-02-21T10:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotency_key.length).toBeGreaterThan(0);
    }
  });

  it("returns duplicate metadata for repeated equivalent operation", () => {
    const first = registerPendingWithDedupe({
      operation_id: "op-dedupe-2",
      chat_id: "chat-2",
      intent: "gasto",
      payload: { monto: 500, concepto: "azucar" },
      timestampMs: Date.parse("2026-02-21T10:00:00.000Z")
    });
    expect(first.ok).toBe(true);

    const second = registerPendingWithDedupe({
      operation_id: "op-dedupe-3",
      chat_id: "chat-2",
      intent: "gasto",
      payload: { monto: 500, concepto: "azucar" },
      timestampMs: Date.parse("2026-02-21T10:00:00.000Z")
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.duplicate_of.operation_id).toBe("op-dedupe-2");
    }
  });
});

