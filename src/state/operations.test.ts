import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dbPath = path.join(os.tmpdir(), `openclaw-ops-${Date.now()}-${Math.random()}.db`);
process.env.BOT_DB_PATH = dbPath;

let registerPendingOperation: (args: {
  operation_id: string;
  chat_id: string;
  intent: string;
  payload: unknown;
  idempotency_key: string;
}) => { inserted: boolean; operation: any };

let upsertOperation: (args: {
  operation_id: string;
  chat_id: string;
  intent: string;
  payload: unknown;
  status: "pending_confirm" | "confirmed" | "canceled" | "executed" | "failed";
  idempotency_key?: string;
}) => void;

let getOperation: (operation_id: string) => any;
let closeDatabase: () => void;

beforeAll(async () => {
  const ops = await import("./operations");
  const db = await import("./database");

  registerPendingOperation = ops.registerPendingOperation;
  upsertOperation = ops.upsertOperation;
  getOperation = ops.getOperation;
  closeDatabase = db.closeDatabase;
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dbPath, { force: true });
});

describe("operations sqlite idempotency", () => {
  it("evita insertar dos operaciones con la misma idempotency_key", () => {
    const first = registerPendingOperation({
      operation_id: "op-1",
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      idempotency_key: "dup-key-1"
    });

    const second = registerPendingOperation({
      operation_id: "op-2",
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      idempotency_key: "dup-key-1"
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.operation.operation_id).toBe("op-1");
  });

  it("actualiza estatus de una operación", () => {
    upsertOperation({
      operation_id: "op-1",
      chat_id: "chat-1",
      intent: "gasto",
      payload: { monto: 380, concepto: "harina" },
      status: "executed",
      idempotency_key: "dup-key-1"
    });

    const row = getOperation("op-1");
    expect(row?.status).toBe("executed");
  });
});
