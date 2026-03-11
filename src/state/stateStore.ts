import { db } from "./database";

export type PendingAction =
  | { intent: "gasto"; payload: any }
  | { intent: "pedido"; payload: any }
  | { intent: "web"; payload: any }
  | { intent: "order.update"; payload: any }
  | { intent: "order.cancel"; payload: any };

export type ConvoState = {
  pending?: {
    operation_id: string;
    idempotency_key?: string;
    action: PendingAction;
    missing?: string[]; // lista de paths faltantes
    asked?: string; // ultimo campo preguntado
  };
};

const nowIso = () => new Date().toISOString();

export function getState(chat_id: string): ConvoState {
  const row = db.prepare("SELECT state_json FROM convo_state WHERE chat_id = ?").get(chat_id) as { state_json: string } | undefined;
  if (!row) return {};
  try {
    return JSON.parse(row.state_json) as ConvoState;
  } catch {
    return {};
  }
}

export function setState(chat_id: string, state: ConvoState) {
  db.prepare(`
    INSERT INTO convo_state(chat_id, state_json, updated_at)
    VALUES(?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at
  `).run(chat_id, JSON.stringify(state), nowIso());
}

export function clearPending(chat_id: string) {
  const st = getState(chat_id);
  delete st.pending;
  setState(chat_id, st);
}
