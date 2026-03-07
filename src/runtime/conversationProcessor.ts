import { v4 as uuidv4 } from "uuid";

import { isCancel, isConfirm } from "../guards/confirmationGuard";
import { registerPendingWithDedupe } from "../guards/dedupeGuard";
import { pickOneMissing } from "../guards/missingFieldPicker";
import type { RateLimitGuard } from "../guards/rateLimitGuard";
import { validateWith } from "../guards/validationGuard";
import { type Expense, ExpenseSchema } from "../schemas/expense";
import { type Order, OrderSchema } from "../schemas/order";
import { type Intent, routeIntentDetailed, type RoutedIntent } from "../skills/intentRouter";
import { parseExpense, parseOrder, type ParseSource } from "../skills/parser";
import { registerPendingOperation, upsertOperation } from "../state/operations";
import { clearPending, getState, setState } from "../state/stateStore";
import { appendExpenseTool } from "../tools/expense/appendExpense";
import { appendOrderTool } from "../tools/order/appendOrder";
import { createCardTool } from "../tools/order/createCard";
import { type WebPublishPayload, createPublishSiteTool } from "../tools/web/publishSite";
import { createBotCopy, type BotPersona } from "./persona";

type ParseResult =
  | { ok: true; payload: Record<string, unknown>; source?: ParseSource }
  | { ok: false; error: string; source?: ParseSource };

type ProcessorDeps = {
  allowedChatIds: Set<string>;
  rateLimiter?: RateLimitGuard;
  nowMs?: () => number;
  newOperationId?: () => string;
  routeIntentDetailedFn?: (text: string) => Promise<RoutedIntent>;
  routeIntentFn?: (text: string) => Promise<Intent>;
  parseExpenseFn?: (text: string) => Promise<ParseResult>;
  parseOrderFn?: (text: string) => Promise<ParseResult>;
  parseWebFn?: (text: string) => Promise<ParseResult>;
  executeExpenseFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: Expense;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeCreateCardFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeAppendOrderFn?: (args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  executeWebPublishFn?: (args: {
    operation_id: string;
    payload: WebPublishPayload;
    dryRun?: boolean;
  }) => Promise<{ ok: boolean; dry_run: boolean; operation_id: string; detail: string }>;
  botPersona?: BotPersona;
  webChatEnabled?: boolean;
  onTrace?: (event: {
    event: string;
    chat_id: string;
    strict_mode: boolean;
    intent?: string;
    intent_source?: string;
    parse_source?: string;
    detail?: string;
  }) => void;
};

function normalizeTipoEnvioInput(raw: string): string {
  const value = raw.trim();
  const normalized = value.toLowerCase();

  if (normalized === "envio_domicilio" || normalized === "recoger_en_tienda") {
    return normalized;
  }

  if (/\b(dom(icilio)?|a domicilio|env[ií]o(?:\s+a)?\s+domicilio)\b/i.test(normalized)) {
    return "envio_domicilio";
  }

  if (/\b(recoger|recoge|retiro|en tienda|tienda)\b/i.test(normalized)) {
    return "recoger_en_tienda";
  }

  return value;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedValue(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = payload;

  for (const part of parts) {
    if (!isObjectRecord(cursor)) return undefined;
    cursor = cursor[part];
  }

  return cursor;
}

function setNestedValue(payload: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split(".");
  const root: Record<string, unknown> = { ...payload };
  let cursor: Record<string, unknown> = root;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const current = cursor[key];
    cursor[key] = isObjectRecord(current) ? { ...current } : {};
    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[parts[parts.length - 1]] = value;
  return root;
}

function parseInlineJsonObject(text: string): { ok: true; value: Record<string, unknown> } | { ok: false } | { ok: null } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return { ok: null };

  const raw = text.slice(start, end + 1).trim();
  try {
    const parsed = JSON.parse(raw);
    if (!isObjectRecord(parsed)) return { ok: false };
    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

async function parseWebRequest(text: string): Promise<ParseResult> {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();
  const action: WebPublishPayload["action"] = /\bpublicar\b/.test(lower)
    ? "publicar"
    : /\bmen[uú]\b/.test(lower)
      ? "menu"
      : "crear";

  const inline = parseInlineJsonObject(normalized);
  if (inline.ok === false) {
    return { ok: false, source: "fallback", error: "web_payload_json_invalid" };
  }

  const payload: Record<string, unknown> = { action };
  if (inline.ok === true) {
    payload.content = inline.value;
  } else if (action !== "publicar") {
    payload.content = {};

    const businessNameMatch = normalized.match(/\b(?:negocio|businessName|nombre)\s*[:=]\s*([^,\n|]+)/i);
    if (businessNameMatch?.[1]) {
      payload.content = setNestedValue(payload.content as Record<string, unknown>, "businessName", businessNameMatch[1].trim());
    }

    const whatsappMatch = normalized.match(/\b(?:whatsapp|wa)\s*[:=]?\s*([+0-9][0-9\s-]{6,})/i);
    if (whatsappMatch?.[1]) {
      payload.content = setNestedValue(payload.content as Record<string, unknown>, "whatsapp", whatsappMatch[1].trim());
    }
  }

  return { ok: true, source: "fallback", payload };
}

function validateWebPayloadDraft(payload: Record<string, unknown>):
  | { ok: true; data: WebPublishPayload }
  | { ok: false; missing: string[] } {
  const actionRaw = typeof payload.action === "string" ? payload.action.toLowerCase() : undefined;
  const action = actionRaw === "crear" || actionRaw === "menu" || actionRaw === "publicar" ? actionRaw : undefined;
  if (!action) {
    return { ok: false, missing: ["action"] };
  }

  const content = isObjectRecord(payload.content) ? { ...payload.content } : {};
  const missing: string[] = [];

  if (action === "crear") {
    const businessName = getNestedValue(content, "businessName");
    const whatsapp = getNestedValue(content, "whatsapp");
    if (typeof businessName !== "string" || businessName.trim().length === 0) {
      missing.push("content.businessName");
    }
    if (typeof whatsapp !== "string" || whatsapp.trim().length === 0) {
      missing.push("content.whatsapp");
    }
  }

  if (action === "menu") {
    const menuItems = Array.isArray(content.menuItems) ? content.menuItems : [];
    const catalogItems = Array.isArray(content.catalogItems) ? content.catalogItems : [];
    if (menuItems.length === 0 && catalogItems.length === 0) {
      missing.push("content.catalogItemsJson");
    }
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const out: WebPublishPayload = action === "publicar" && Object.keys(content).length === 0
    ? { action }
    : { action, content };

  return { ok: true, data: out };
}

function mergeField(payload: Record<string, unknown>, field: string, userText: string): Record<string, unknown> {
  const t = userText.trim();
  if (field === "monto" || field === "cantidad" || field === "total") return { ...payload, [field]: Number(t) };
  if (field === "tipo_envio") return { ...payload, [field]: normalizeTipoEnvioInput(t) };
  if (field === "content.catalogItemsJson") {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return payload;
      return setNestedValue(payload, "content.catalogItems", parsed);
    } catch {
      return payload;
    }
  }
  if (field === "content.menuItemsJson") {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return payload;
      return setNestedValue(payload, "content.menuItems", parsed);
    } catch {
      return payload;
    }
  }
  if (field.includes(".")) {
    return setNestedValue(payload, field, t);
  }
  return { ...payload, [field]: t };
}

export function createConversationProcessor(deps: ProcessorDeps) {
  const strict_mode = process.env.OPENCLAW_STRICT === "1";
  const nowMs = deps.nowMs ?? (() => Date.now());
  const newOperationId = deps.newOperationId ?? uuidv4;
  const routeIntentDetailedFn = deps.routeIntentDetailedFn ?? routeIntentDetailed;
  const routeIntentFn = deps.routeIntentFn;
  const parseExpenseFn = deps.parseExpenseFn ?? parseExpense;
  const parseOrderFn = deps.parseOrderFn ?? parseOrder;
  const parseWebFn = deps.parseWebFn ?? parseWebRequest;
  const executeExpenseFn = deps.executeExpenseFn ?? appendExpenseTool;
  const executeCreateCardFn = deps.executeCreateCardFn ?? createCardTool;
  const executeAppendOrderFn = deps.executeAppendOrderFn ?? appendOrderTool;
  const executeWebPublishFn = deps.executeWebPublishFn ?? createPublishSiteTool();
  const copy = createBotCopy(deps.botPersona);
  const webChatEnabled = deps.webChatEnabled ?? true;
  const rateLimiter = deps.rateLimiter;

  async function handleMessage(msg: { chat_id: string; text: string }): Promise<string[]> {
    if (!deps.allowedChatIds.has(msg.chat_id)) {
      deps.onTrace?.({
        event: "allowlist_reject",
        chat_id: msg.chat_id,
        strict_mode,
        detail: "chat_id_not_allowed"
      });
      return [copy.unauthorized()];
    }

    const rateLimit = rateLimiter?.check(msg.chat_id);
    if (rateLimit && !rateLimit.ok) {
      deps.onTrace?.({
        event: "rate_limit_reject",
        chat_id: msg.chat_id,
        strict_mode,
        detail: `${rateLimit.reason};retry_after=${rateLimit.retryAfterSeconds}s`
      });
      return [copy.rateLimited(rateLimit.retryAfterSeconds)];
    }

    const st = getState(msg.chat_id);

    if (st.pending) {
      if (isConfirm(msg.text)) {
        const idempotencyKey = st.pending.idempotency_key ?? st.pending.operation_id;

        upsertOperation({
          operation_id: st.pending.operation_id,
          chat_id: msg.chat_id,
          intent: st.pending.action.intent,
          payload: st.pending.action.payload,
          status: "confirmed",
          idempotency_key: idempotencyKey
        });

        if (st.pending.action.intent === "gasto") {
          const vExpense = validateWith(ExpenseSchema, st.pending.action.payload);
          if (!vExpense.ok) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "expense_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "gasto",
              detail: "payload_validation_failed"
            });

            return [
              copy.expenseFailed(st.pending.operation_id)
            ];
          }

          try {
            const execution = await executeExpenseFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              payload: vExpense.data
            });

            if (!execution.ok) {
              throw new Error(execution.detail || "expense_execution_failed");
            }

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "expense_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "gasto",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "expense_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "gasto",
              detail: safeDetail
            });

            return [
              copy.expenseFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "pedido") {
          const vOrder = validateWith(OrderSchema, st.pending.action.payload);
          if (!vOrder.ok) {
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "pedido",
              detail: "payload_validation_failed"
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }

          try {
            const cardExecution = await executeCreateCardFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              payload: vOrder.data
            });
            if (!cardExecution.ok) {
              throw new Error(cardExecution.detail || "order_create_card_failed");
            }

            const appendExecution = await executeAppendOrderFn({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              payload: vOrder.data
            });
            if (!appendExecution.ok) {
              throw new Error(appendExecution.detail || "order_append_failed");
            }

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "pedido",
              detail: `${cardExecution.detail};${appendExecution.detail}`
            });

            clearPending(msg.chat_id);
            const isDryRun = cardExecution.dry_run && appendExecution.dry_run;
            return [copy.executed(st.pending.operation_id, isDryRun)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "order_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "pedido",
              detail: safeDetail
            });

            return [
              copy.orderFailed(st.pending.operation_id)
            ];
          }
        }

        if (st.pending.action.intent === "web") {
          const vWeb = validateWebPayloadDraft(st.pending.action.payload as Record<string, unknown>);
          if (!vWeb.ok) {
            st.pending.missing = vWeb.missing;
            const next = pickOneMissing(vWeb.missing, st.pending.asked);
            st.pending.asked = next ?? undefined;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "pending_confirm",
              idempotency_key: idempotencyKey
            });
            setState(msg.chat_id, st);
            return [copy.askFor(st.pending.asked ?? "unknown")];
          }

          try {
            const execution = await executeWebPublishFn({
              operation_id: st.pending.operation_id,
              payload: vWeb.data
            });
            if (!execution.ok) {
              throw new Error(execution.detail || "web_publish_failed");
            }

            st.pending.action.payload = vWeb.data as unknown as Record<string, unknown>;
            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "executed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "web_execute_succeeded",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "web",
              detail: execution.detail
            });

            clearPending(msg.chat_id);
            return [copy.executed(st.pending.operation_id, execution.dry_run)];
          } catch (err) {
            const safeDetail = err instanceof Error ? err.message : String(err);

            upsertOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: st.pending.action.intent,
              payload: st.pending.action.payload,
              status: "failed",
              idempotency_key: idempotencyKey
            });

            deps.onTrace?.({
              event: "web_execute_failed",
              chat_id: msg.chat_id,
              strict_mode,
              intent: "web",
              detail: safeDetail
            });

            return [
              copy.webFailed(st.pending.operation_id)
            ];
          }
        }

        upsertOperation({
          operation_id: st.pending.operation_id,
          chat_id: msg.chat_id,
          intent: st.pending.action.intent,
          payload: st.pending.action.payload,
          status: "executed",
          idempotency_key: idempotencyKey
        });

        clearPending(msg.chat_id);
        return [copy.executedSimulated(st.pending.operation_id)];
      }

      if (isCancel(msg.text)) {
        upsertOperation({
          operation_id: st.pending.operation_id,
          chat_id: msg.chat_id,
          intent: st.pending.action.intent,
          payload: st.pending.action.payload,
          status: "canceled",
          idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
        });

        clearPending(msg.chat_id);
        return [copy.canceled(st.pending.operation_id)];
      }

      if (st.pending.asked) {
        const updatedPayload = mergeField(st.pending.action.payload, st.pending.asked, msg.text);
        st.pending.action.payload = updatedPayload;

        if (st.pending.action.intent === "web") {
          const vWeb = validateWebPayloadDraft(updatedPayload);
          if (vWeb.ok) {
            const register = registerPendingOperation({
              operation_id: st.pending.operation_id,
              chat_id: msg.chat_id,
              intent: "web",
              payload: vWeb.data,
              idempotency_key: st.pending.idempotency_key ?? st.pending.operation_id
            });

            if (!register.inserted) {
              clearPending(msg.chat_id);
              return [
                copy.duplicate(register.operation.operation_id, register.operation.status)
              ];
            }

            st.pending.action.payload = vWeb.data as unknown as Record<string, unknown>;
            st.pending.idempotency_key = st.pending.operation_id;
            st.pending.missing = [];
            st.pending.asked = undefined;
            setState(msg.chat_id, st);
            return [copy.summary(st.pending.action.intent, st.pending.action.payload, st.pending.operation_id)];
          }

          st.pending.missing = vWeb.missing;
          const next = pickOneMissing(vWeb.missing, st.pending.asked);
          st.pending.asked = next ?? undefined;
          setState(msg.chat_id, st);
          return [copy.askFor(st.pending.asked ?? "unknown")];
        }

        const schema = st.pending.action.intent === "gasto" ? ExpenseSchema : OrderSchema;
        const v = validateWith(schema, updatedPayload);

        if (v.ok) {
          const intent = st.pending.action.intent as "gasto" | "pedido";
          const dedupe = registerPendingWithDedupe({
            operation_id: st.pending.operation_id,
            chat_id: msg.chat_id,
            intent,
            payload: v.data,
            timestampMs: nowMs()
          });

          if (!dedupe.ok) {
            clearPending(msg.chat_id);
            return [
              copy.duplicate(dedupe.duplicate_of.operation_id, dedupe.duplicate_of.status)
            ];
          }

          st.pending.action.payload = v.data;
          st.pending.idempotency_key = dedupe.idempotency_key;
          st.pending.missing = [];
          st.pending.asked = undefined;
          setState(msg.chat_id, st);

          return [copy.summary(st.pending.action.intent, st.pending.action.payload, st.pending.operation_id)];
        }

        st.pending.missing = v.missing;
        const next = pickOneMissing(v.missing, st.pending.asked);
        st.pending.asked = next ?? undefined;
        setState(msg.chat_id, st);

        return [copy.askFor(st.pending.asked ?? "unknown")];
      }

      return [copy.pendingOperation(st.pending.operation_id)];
    }

    let intent: Intent;
    let intentSource = "openclaw";

    if (routeIntentFn) {
      intent = await routeIntentFn(msg.text);
      intentSource = "custom";
    } else {
      const routed = await routeIntentDetailedFn(msg.text);
      intent = routed.intent;
      intentSource = routed.source;

      deps.onTrace?.({
        event: "intent_routed",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        detail: routed.openclaw_error
      });
    }

    if (intent === "ayuda") {
      return [copy.help()];
    }

    if (intent === "unknown") {
      return [copy.unknown()];
    }

    const operation_id = newOperationId();

    if (intent === "web") {
      if (!webChatEnabled) {
        return [copy.webDisabled()];
      }

      const parsed = await parseWebFn(msg.text);
      if (!parsed.ok) {
        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent,
          intent_source: intentSource,
          parse_source: parsed.source ?? "unknown",
          detail: parsed.error
        });
        return [copy.parseError(parsed.error)];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        parse_source: parsed.source ?? "fallback"
      });

      const vWeb = validateWebPayloadDraft(parsed.payload);
      const pending = {
        operation_id,
        action: { intent: "web" as const, payload: parsed.payload },
        missing: vWeb.ok ? [] : vWeb.missing,
        asked: vWeb.ok ? undefined : pickOneMissing(vWeb.missing)
      };

      setState(msg.chat_id, { pending });

      if (vWeb.ok) {
        const register = registerPendingOperation({
          operation_id,
          chat_id: msg.chat_id,
          intent: "web",
          payload: vWeb.data,
          idempotency_key: operation_id
        });

        if (!register.inserted) {
          clearPending(msg.chat_id);
          return [
            copy.duplicate(register.operation.operation_id, register.operation.status)
          ];
        }

        setState(msg.chat_id, {
          pending: {
            ...pending,
            idempotency_key: operation_id,
            action: { intent: "web", payload: vWeb.data as unknown as Record<string, unknown> },
            missing: [],
            asked: undefined
          }
        });

        return [copy.summary(intent, vWeb.data as unknown as Record<string, unknown>, operation_id)];
      }

      return [copy.askFor(pending.asked ?? "unknown")];
    }

    if (intent === "gasto") {
      const parsed = await parseExpenseFn(msg.text);
      if (!parsed.ok) {
        deps.onTrace?.({
          event: "parse_failed",
          chat_id: msg.chat_id,
          strict_mode,
          intent,
          intent_source: intentSource,
          parse_source: parsed.source ?? "unknown",
          detail: parsed.error
        });
        return [copy.parseError(parsed.error)];
      }

      deps.onTrace?.({
        event: "parse_succeeded",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        parse_source: parsed.source ?? "custom"
      });

      const v = validateWith(ExpenseSchema, parsed.payload);
      const pending = {
        operation_id,
        action: { intent: "gasto" as const, payload: parsed.payload },
        missing: v.ok ? [] : v.missing,
        asked: v.ok ? undefined : pickOneMissing(v.missing)
      };

      setState(msg.chat_id, { pending });

      if (v.ok) {
        const dedupe = registerPendingWithDedupe({
          operation_id,
          chat_id: msg.chat_id,
          intent,
          payload: v.data,
          timestampMs: nowMs()
        });

        if (!dedupe.ok) {
          clearPending(msg.chat_id);
          return [
            copy.duplicate(dedupe.duplicate_of.operation_id, dedupe.duplicate_of.status)
          ];
        }

        const full = v.data;
        setState(msg.chat_id, {
          pending: {
            ...pending,
            idempotency_key: dedupe.idempotency_key,
            action: { intent: "gasto", payload: full },
            missing: [],
            asked: undefined
          }
        });

        return [copy.summary(intent, full, operation_id)];
      }

      return [copy.askFor(pending.asked ?? "unknown")];
    }

    const parsed = await parseOrderFn(msg.text);
    if (!parsed.ok) {
      deps.onTrace?.({
        event: "parse_failed",
        chat_id: msg.chat_id,
        strict_mode,
        intent,
        intent_source: intentSource,
        parse_source: parsed.source ?? "unknown",
        detail: parsed.error
      });
      return [copy.parseError(parsed.error)];
    }

    deps.onTrace?.({
      event: "parse_succeeded",
      chat_id: msg.chat_id,
      strict_mode,
      intent,
      intent_source: intentSource,
      parse_source: parsed.source ?? "custom"
    });

    const v = validateWith(OrderSchema, parsed.payload);
    const pending = {
      operation_id,
      action: { intent: "pedido" as const, payload: parsed.payload },
      missing: v.ok ? [] : v.missing,
      asked: v.ok ? undefined : pickOneMissing(v.missing)
    };

    setState(msg.chat_id, { pending });

    if (v.ok) {
      const dedupe = registerPendingWithDedupe({
        operation_id,
        chat_id: msg.chat_id,
        intent,
        payload: v.data,
        timestampMs: nowMs()
      });

      if (!dedupe.ok) {
        clearPending(msg.chat_id);
        return [
          copy.duplicate(dedupe.duplicate_of.operation_id, dedupe.duplicate_of.status)
        ];
      }

      const full = v.data;
      setState(msg.chat_id, {
        pending: {
          ...pending,
          idempotency_key: dedupe.idempotency_key,
          action: { intent: "pedido", payload: full },
          missing: [],
          asked: undefined
        }
      });

      return [copy.summary(intent, full, operation_id)];
    }

    return [copy.askFor(pending.asked ?? "unknown")];
  }

  return { handleMessage };
}
