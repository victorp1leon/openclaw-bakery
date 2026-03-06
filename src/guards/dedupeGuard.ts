import { buildIdempotencyKey } from "../state/idempotency";
import { registerPendingOperation, type OperationRow } from "../state/operations";

type DedupeIntent = "gasto" | "pedido";

export function registerPendingWithDedupe(args: {
  operation_id: string;
  chat_id: string;
  intent: DedupeIntent;
  payload: unknown;
  timestampMs?: number;
}):
  | { ok: true; idempotency_key: string }
  | { ok: false; duplicate_of: OperationRow } {
  const idempotency_key = buildIdempotencyKey({
    chat_id: args.chat_id,
    intent: args.intent,
    payload: args.payload,
    timestampMs: args.timestampMs
  });

  const result = registerPendingOperation({
    operation_id: args.operation_id,
    chat_id: args.chat_id,
    intent: args.intent,
    payload: args.payload,
    idempotency_key
  });

  if (!result.inserted) {
    return { ok: false, duplicate_of: result.operation };
  }

  return { ok: true, idempotency_key };
}
