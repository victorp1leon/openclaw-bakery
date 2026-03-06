import { db } from "./database";

const nowIso = () => new Date().toISOString();

export type OperationStatus = "pending_confirm" | "confirmed" | "canceled" | "executed" | "failed";

export type OperationRow = {
  operation_id: string;
  chat_id: string;
  intent: string;
  payload_json: string;
  status: OperationStatus;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export function upsertOperation(op: {
  operation_id: string;
  chat_id: string;
  intent: string;
  payload: unknown;
  status: OperationStatus;
  idempotency_key?: string;
}) {
  const idempotencyKey = op.idempotency_key ?? op.operation_id;
  const ts = nowIso();

  db.prepare(`
    INSERT INTO operations(operation_id, chat_id, intent, payload_json, status, idempotency_key, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(operation_id) DO UPDATE SET
      payload_json=excluded.payload_json,
      status=excluded.status,
      idempotency_key=excluded.idempotency_key,
      updated_at=excluded.updated_at
  `).run(op.operation_id, op.chat_id, op.intent, JSON.stringify(op.payload), op.status, idempotencyKey, ts, ts);
}

export function registerPendingOperation(op: {
  operation_id: string;
  chat_id: string;
  intent: string;
  payload: unknown;
  idempotency_key: string;
}) {
  const existing = findOperationByIdempotencyKey(op.idempotency_key);
  if (existing) {
    return { inserted: false as const, operation: existing };
  }

  upsertOperation({ ...op, status: "pending_confirm" });
  const created = getOperation(op.operation_id);
  if (!created) {
    throw new Error(`operation_insert_failed:${op.operation_id}`);
  }
  return { inserted: true as const, operation: created };
}

export function findOperationByIdempotencyKey(idempotency_key: string) {
  return db.prepare(`SELECT * FROM operations WHERE idempotency_key = ?`).get(idempotency_key) as OperationRow | undefined;
}

export function getOperation(operation_id: string) {
  return db.prepare(`SELECT * FROM operations WHERE operation_id = ?`).get(operation_id) as OperationRow | undefined;
}
