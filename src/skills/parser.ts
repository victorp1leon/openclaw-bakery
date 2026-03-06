import { z } from "zod";

import { isStrictSoftfailEnabled, isTransientOpenClawError } from "../openclaw/failover";
import { createOpenClawJsonRuntime, type OpenClawJsonRuntime } from "../openclaw/runtime";
import { firstOpenClawPayloadText, unwrapOpenClawPayloadJson } from "../openclaw/jsonExtract";
import { ExpenseDraftSchema, type ExpenseDraft } from "../schemas/expense";
import { OrderDraftSchema, type OrderDraft } from "../schemas/order";

export type ParseSource = "openclaw" | "fallback" | "custom";
export type ParseResult<T> =
  | { ok: true; payload: T; source: ParseSource }
  | { ok: false; error: string; source: "openclaw" };

function isStrictMode(): boolean {
  return process.env.OPENCLAW_STRICT === "1";
}

function toNumberMaybe(s: string): number | null {
  const n = Number(String(s).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function hasDateCue(text: string): boolean {
  return (
    /\b(hoy|ayer|mañana|fecha)\b/i.test(text) ||
    /\b\d{1,4}[/-]\d{1,2}(?:[/-]\d{1,4})?\b/.test(text)
  );
}

function cleanOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim().toLowerCase();
  if (!t) return undefined;
  if (/^(mxn|peso|pesos)$/.test(t)) return "MXN";
  if (/^(usd|dolar|dólar|dolares|dólares)$/.test(t)) return "USD";
  return value.trim();
}

function sanitizeExpenseDraft(payload: ExpenseDraft, originalText: string): ExpenseDraft {
  const text = originalText.toLowerCase();
  const out: ExpenseDraft = { ...payload };

  const moneda = normalizeCurrency(out.moneda);
  if (moneda) {
    const hasCurrencyCue = /\b(mxn|mxn\.|pesos?|peso|usd|d[oó]lares?)\b/i.test(originalText);
    out.moneda = hasCurrencyCue ? moneda : undefined;
  } else {
    out.moneda = undefined;
  }

  if (out.categoria && !/\b(insumos|servicios|otros)\b/i.test(originalText)) {
    out.categoria = undefined;
  }

  if (out.metodo_pago && !/\b(efectivo|transferencia|tarjeta)\b/i.test(originalText)) {
    out.metodo_pago = undefined;
  }

  const proveedor = cleanOptionalText(out.proveedor);
  out.proveedor = proveedor && (/\bproveedor\b/i.test(originalText) || text.includes(proveedor.toLowerCase())) ? proveedor : undefined;

  const notas = cleanOptionalText(out.notas);
  out.notas = notas && (/\bnota(s)?\b/i.test(originalText) || text.includes(notas.toLowerCase())) ? notas : undefined;

  const fecha = cleanOptionalText(out.fecha);
  out.fecha = fecha && (hasDateCue(originalText) || text.includes(fecha.toLowerCase())) ? fecha : undefined;

  return out;
}

function hasOrderDeliveryCue(text: string): boolean {
  return (
    /\b(entrega|mañana|manana|hoy|ayer|para)\b/i.test(text) ||
    /\b\d{1,2}:\d{2}\b/.test(text) ||
    hasDateCue(text)
  );
}

function sanitizeOrderDraft(payload: OrderDraft, originalText: string): OrderDraft {
  const text = originalText.toLowerCase();
  const out: OrderDraft = { ...payload };

  out.nombre_cliente = cleanOptionalText(out.nombre_cliente);
  out.producto = cleanOptionalText(out.producto);
  out.direccion = cleanOptionalText(out.direccion);
  out.telefono = cleanOptionalText(out.telefono);
  out.descripcion_producto = cleanOptionalText(out.descripcion_producto);
  out.notas = cleanOptionalText(out.notas);

  const moneda = normalizeCurrency(out.moneda);
  if (moneda) {
    const hasCurrencyCue = /\b(mxn|mxn\.|pesos?|peso|usd|d[oó]lares?)\b/i.test(originalText);
    out.moneda = hasCurrencyCue ? moneda : undefined;
  } else {
    out.moneda = undefined;
  }

  if (out.estado_pago && !/\b(pagado|pendiente|parcial)\b/i.test(originalText)) {
    out.estado_pago = undefined;
  }

  if (
    out.tipo_envio &&
    !/\b(recoger|domicilio|envio|envío)\b/i.test(originalText)
  ) {
    out.tipo_envio = undefined;
  }

  if (out.sabor_pan && !new RegExp(`\\b${out.sabor_pan.replace("_", "[ _]?")}\\b`, "i").test(originalText)) {
    out.sabor_pan = undefined;
  }

  if (out.sabor_relleno && !new RegExp(`\\b${out.sabor_relleno.replace(/_/g, "[ _]?")}\\b`, "i").test(originalText)) {
    out.sabor_relleno = undefined;
  }

  if (out.fecha_hora_entrega) {
    const entrega = cleanOptionalText(out.fecha_hora_entrega);
    out.fecha_hora_entrega =
      entrega && (hasOrderDeliveryCue(originalText) || text.includes(entrega.toLowerCase())) ? entrega : undefined;
  }

  if (out.total != null) {
    const hasTotalCue = /\btotal[:=]?\b/i.test(originalText);
    const hasCurrencyCue = /\b(mxn|mxn\.|pesos?|peso|usd|d[oó]lares?)\b/i.test(originalText);
    if (!hasTotalCue && !hasCurrencyCue) {
      out.total = undefined;
    }
  }

  if (out.tipo_envio !== "envio_domicilio") {
    if (out.direccion && !/\b(direcci[oó]n|domicilio|env[ií]o)\b/i.test(originalText)) {
      out.direccion = undefined;
    }
  }

  return out;
}

function fillMissingFields<T extends Record<string, unknown>>(primary: T, fallback: Partial<T>): T {
  const merged: Record<string, unknown> = { ...primary };

  for (const [key, value] of Object.entries(fallback)) {
    if (merged[key] === undefined && value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

function pickExpenseAmountMatch(raw: string): RegExpMatchArray | null {
  return (
    raw.match(/\b(?:por|total[:=]?)\s*(\d+(?:[.,]\d+)?)\s*(mxn|mxn\.|pesos?|peso|usd|d[oó]lares?)\b/i) ??
    raw.match(/\b(\d+(?:[.,]\d+)?)\s*(mxn|mxn\.|pesos?|peso|usd|d[oó]lares?)\b/i) ??
    raw.match(/(\d+(?:[.,]\d+)?)/)
  );
}

function parseExpenseHeuristic(text: string): ExpenseDraft {
  const original = text.trim();
  const afterIntentKeyword = original.replace(/^.*?\bgasto\b[:\s-]*/i, "");
  const rawBase = afterIntentKeyword === original ? original : afterIntentKeyword;
  const raw = rawBase.replace(/\b(\d+)\s*(kilos?|kilo|kgs?|kg|gramos?|gr|g)\b/gi, "$1 $2");

  const amountMatch = pickExpenseAmountMatch(raw);
  const monto = amountMatch ? toNumberMaybe(amountMatch[1]) ?? undefined : undefined;

  let concepto = raw
    .replace(amountMatch?.[0] ?? "", " ")
    .replace(/\b(mxn|mxn\.|pesos?|peso|usd|d[oó]lares?)\b/gi, " ")
    .replace(/\b(agrega|agregar|registra|registrar|anota|anotar|gasto)\b/gi, " ")
    .replace(/\b(un|una|el|la|los|las|de|por|para)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (concepto.length < 2) concepto = "";

  return { monto, concepto: concepto || undefined };
}

function parseOrderHeuristic(text: string): OrderDraft {
  const raw = text.trim().replace(/^pedido\s*/i, "");

  const payload: Partial<OrderDraft> = {};
  const tokens = raw.split(" ").filter(Boolean);

  payload.nombre_cliente = tokens[0];

  const qty = toNumberMaybe(tokens[1]);
  if (qty != null) payload.cantidad = Math.trunc(qty);

  const rest = tokens.slice(2).join(" ");

  const totalMatch = rest.match(/\btotal[:=]\s*([0-9.]+)/i);
  if (totalMatch) payload.total = Number(totalMatch[1]);

  const pago = rest.match(/\b(pagado|pendiente|parcial)\b/i)?.[1];
  if (pago) payload.estado_pago = pago.toLowerCase() as OrderDraft["estado_pago"];

  const envio =
    rest.match(/\benvio[:=]\s*(domicilio|recoger)\b/i)?.[1] ??
    rest.match(/\b(recoger|domicilio)\b/i)?.[1];

  if (envio) {
    payload.tipo_envio = envio.toLowerCase() === "domicilio" ? "envio_domicilio" : "recoger_en_tienda";
  }

  const entrega = rest.match(/\b(entrega|para)[:=]\s*([^|]+)$/i)?.[2]?.trim();
  if (entrega) payload.fecha_hora_entrega = entrega;

  const cleaned = rest
    .replace(/\b(total[:=]\s*[0-9.]+)\b/gi, "")
    .replace(/\b(envio[:=]\s*(domicilio|recoger))\b/gi, "")
    .replace(/\b(entrega[:=]\s*[^|]+)\b/gi, "")
    .replace(/\b(pagado|pendiente|parcial)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned) payload.producto = cleaned;

  return payload;
}

function extractPayload<T>(raw: unknown): unknown {
  const wrapped = z.object({ payload: z.unknown() }).safeParse(raw);
  if (wrapped.success) return wrapped.data.payload;
  return raw;
}

async function parseWithOpenClaw<T>(args: {
  prompt: string;
  schema: z.ZodType<T>;
  runtime: OpenClawJsonRuntime;
}): Promise<ParseResult<T>> {
  try {
    const raw = await args.runtime.completeJson(args.prompt);
    const payloadText = firstOpenClawPayloadText(raw);
    const normalized = unwrapOpenClawPayloadJson(raw);
    const candidate = extractPayload(normalized);
    const parsed = args.schema.safeParse(candidate);

    if (!parsed.success) {
      return {
        ok: false,
        source: "openclaw",
        error: payloadText
          ? `openclaw_non_json_payload:${payloadText}`
          : `openclaw_parse_invalid_json:${parsed.error.issues[0]?.message ?? "invalid"}`
      };
    }

    return { ok: true, payload: parsed.data, source: "openclaw" };
  } catch (err) {
    return {
      ok: false,
      source: "openclaw",
      error: err instanceof Error ? err.message : "openclaw_parse_failed"
    };
  }
}

export async function parseExpense(
  text: string,
  runtime: OpenClawJsonRuntime = createOpenClawJsonRuntime()
): Promise<ParseResult<ExpenseDraft>> {
  const strict_mode = isStrictMode();
  const prompt = [
    "Extrae un gasto de texto libre en español.",
    "Responde SOLO JSON válido y estricto.",
    "Devuelve únicamente los campos conocidos del payload; omite faltantes.",
    "Campos válidos: monto(number), concepto(string), moneda(string), categoria(insumos|servicios|otros), metodo_pago(efectivo|transferencia|tarjeta), proveedor(string), fecha(string), notas(string).",
    "Estructura exacta esperada:",
    "{\"payload\":{...}}",
    `Texto: ${text}`
  ].join("\n");

  const fromOpenClaw = await parseWithOpenClaw({
    prompt,
    schema: ExpenseDraftSchema,
    runtime
  });

  if (fromOpenClaw.ok) {
    const heuristic = ExpenseDraftSchema.safeParse(parseExpenseHeuristic(text));
    if (!heuristic.success) {
      return { ok: true, payload: sanitizeExpenseDraft(fromOpenClaw.payload, text), source: fromOpenClaw.source };
    }

    return {
      ok: true,
      payload: sanitizeExpenseDraft(fillMissingFields(fromOpenClaw.payload, heuristic.data), text),
      source: fromOpenClaw.source
    };
  }
  if (strict_mode && (!isStrictSoftfailEnabled() || !isTransientOpenClawError(fromOpenClaw.error))) return fromOpenClaw;

  const fallback = ExpenseDraftSchema.safeParse(parseExpenseHeuristic(text));
  if (fallback.success) {
    return { ok: true, payload: sanitizeExpenseDraft(fallback.data, text), source: "fallback" };
  }

  return { ok: false, source: "openclaw", error: fromOpenClaw.error };
}

export async function parseOrder(
  text: string,
  runtime: OpenClawJsonRuntime = createOpenClawJsonRuntime()
): Promise<ParseResult<OrderDraft>> {
  const strict_mode = isStrictMode();
  const prompt = [
    "Extrae un pedido de texto libre en español.",
    "Responde SOLO JSON válido y estricto.",
    "Devuelve únicamente los campos conocidos del payload; omite faltantes.",
    "Campos válidos: nombre_cliente, producto, cantidad, tipo_envio(envio_domicilio|recoger_en_tienda), fecha_hora_entrega, direccion, telefono, descripcion_producto, sabor_pan(vainilla|chocolate|red_velvet|otro), sabor_relleno(cajeta|mermelada_fresa|oreo), estado_pago(pagado|pendiente|parcial), total, moneda, notas.",
    "Estructura exacta esperada:",
    "{\"payload\":{...}}",
    `Texto: ${text}`
  ].join("\n");

  const fromOpenClaw = await parseWithOpenClaw({
    prompt,
    schema: OrderDraftSchema,
    runtime
  });

  if (fromOpenClaw.ok) {
    const heuristic = OrderDraftSchema.safeParse(parseOrderHeuristic(text));
    if (!heuristic.success) {
      return { ok: true, payload: sanitizeOrderDraft(fromOpenClaw.payload, text), source: fromOpenClaw.source };
    }

    return {
      ok: true,
      payload: sanitizeOrderDraft(fillMissingFields(fromOpenClaw.payload, heuristic.data), text),
      source: fromOpenClaw.source
    };
  }
  if (strict_mode && (!isStrictSoftfailEnabled() || !isTransientOpenClawError(fromOpenClaw.error))) return fromOpenClaw;

  const fallback = OrderDraftSchema.safeParse(parseOrderHeuristic(text));
  if (fallback.success) {
    return { ok: true, payload: sanitizeOrderDraft(fallback.data, text), source: "fallback" };
  }

  return { ok: false, source: "openclaw", error: fromOpenClaw.error };
}
