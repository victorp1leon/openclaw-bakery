import type { OrderCancelReference } from "../tools/order/cancelOrder";
import type { InventoryConsumeReference } from "../tools/order/inventoryConsume";
import type { PaymentRecordReference } from "../tools/order/recordPayment";
import type { OrderUpdateReference } from "../tools/order/updateOrder";

export type MutationParseResult =
  | { ok: true; payload: Record<string, unknown>; source: "fallback" }
  | { ok: false; error: string; source: "fallback" };

export type MutationParseDraft = { matched: false } | { matched: true; result: MutationParseResult };

const ORDER_UPDATE_PATCH_FIELDS = new Set([
  "fecha_hora_entrega",
  "nombre_cliente",
  "telefono",
  "producto",
  "descripcion_producto",
  "cantidad",
  "sabor_pan",
  "sabor_relleno",
  "tipo_envio",
  "direccion",
  "estado_pago",
  "total",
  "moneda",
  "notas"
]);
const ORDER_REFERENCE_TOKEN_PATTERN = /^[a-z0-9][a-z0-9_-]{2,}$/i;
const ORDER_REFERENCE_RESERVED_VALUES = new Set([
  "pendiente",
  "pagado",
  "parcial",
  "confirmar",
  "cancelar",
  "si",
  "no",
  "ok",
  "listo"
]);

function normalizeForMatch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function sanitizeOrderReferenceValue(value: unknown): string | undefined {
  const out = trimString(value);
  if (!out) return undefined;
  if (!ORDER_REFERENCE_TOKEN_PATTERN.test(out)) return undefined;
  const normalized = normalizeForMatch(out);
  if (ORDER_REFERENCE_RESERVED_VALUES.has(normalized)) return undefined;
  return out;
}

export function extractOrderReferenceFromText(text: string): { folio?: string; operation_id_ref?: string } {
  const folio = sanitizeOrderReferenceValue(text.match(/\bfolio\s*[:=]?\s*([a-z0-9_-]{3,})\b/i)?.[1]);
  const operationId = sanitizeOrderReferenceValue(text.match(/\b(?:operation_id|operacion|id)\s*[:=]?\s*([a-z0-9_-]{3,})\b/i)?.[1]);
  return {
    folio,
    operation_id_ref: operationId
  };
}

export function hasOrderReference(value: unknown): boolean {
  if (!isObjectRecord(value)) return false;
  const folio = sanitizeOrderReferenceValue(value.folio);
  const operationId = sanitizeOrderReferenceValue(value.operation_id_ref);
  return Boolean(folio || operationId);
}

export function referenceFromFreeText(text: string): { folio?: string; operation_id_ref?: string } {
  const fromTagged = extractOrderReferenceFromText(text);
  if (fromTagged.folio || fromTagged.operation_id_ref) return fromTagged;

  const fallback = sanitizeOrderReferenceValue(text);
  if (fallback) {
    return { folio: fallback };
  }
  return {};
}

export function inventoryOrderRefLabel(payload: unknown): string {
  if (!isObjectRecord(payload)) return "pedido";
  const reference = isObjectRecord(payload.reference) ? payload.reference : payload;
  const folio = sanitizeOrderReferenceValue(reference.folio);
  if (folio) return folio;
  const operationId = sanitizeOrderReferenceValue(reference.operation_id_ref);
  if (operationId) return operationId;
  return "pedido";
}

function parseOrderUpdatePatchFromText(text: string): Record<string, unknown> | undefined {
  const normalized = normalizeForMatch(text);
  const patch: Record<string, unknown> = {};

  const deliveryMatch =
    text.match(
      /\b(?:fecha(?:\s+y)?\s*hora(?:\s+de)?\s*entrega|fecha(?:\s+de)?\s+entrega|entrega)\s*(?:a|para|=|:)?\s*((?:\d{4}[/-]\d{1,2}[/-]\d{1,2})(?:[ t]\d{1,2}:\d{2})?)\b/i
    )?.[1] ??
    text.match(
      /\b(?:fecha(?:\s+y)?\s*hora(?:\s+de)?\s*entrega|fecha(?:\s+de)?\s+entrega|entrega)\s*(?:a|para|=|:)?\s*([^,.;\n]+?)(?=\s+y\s+(?:estado|cantidad|total|producto|direccion|tipo|notas?|nombre)\b|$)/i
    )?.[1];
  if (deliveryMatch) {
    patch.fecha_hora_entrega = deliveryMatch.replace(/[Tt]/g, " ").replace(/\//g, "-").trim();
  }

  const paymentMatch =
    normalized.match(/\bestado\s+de\s+pago\s*(?:a|en|=|:|como)?\s*(pagado|pendiente|parcial)\b/)?.[1] ??
    (/\b(?:pago|abono)\b/.test(normalized) ? normalized.match(/\b(pagado|pendiente|parcial)\b/)?.[1] : undefined);
  if (paymentMatch) {
    patch.estado_pago = paymentMatch;
  }

  const shippingValue =
    text.match(
      /\b(?:tipo\s+de?\s*envio|envio)\s*(?:a|en|=|:|para)?\s*(envio_domicilio|recoger_en_tienda|envio a domicilio|a domicilio|recoger en tienda|retiro en tienda)\b/i
    )?.[1] ??
    text.match(/\b(envio a domicilio|a domicilio|recoger en tienda|retiro en tienda)\b/i)?.[1];
  if (shippingValue) {
    patch.tipo_envio = normalizeTipoEnvioInput(shippingValue);
  }

  const quantityMatch = normalized.match(/\b(?:cantidad|piezas?|unidades?)\s*(?:a|=|:)?\s*(\d+)\b/)?.[1];
  if (quantityMatch) {
    patch.cantidad = Number(quantityMatch);
  }

  const totalMatch = normalized.match(/\btotal\s*(?:a|=|:)?\s*(\d+(?:[.,]\d+)?)\b/)?.[1];
  if (totalMatch) {
    patch.total = Number(totalMatch.replace(",", "."));
  }

  const customerMatch = text.match(/\b(?:nombre(?:\s+del)?\s+cliente|cliente)\s*(?:a|=|:)\s*([^,.;\n]+)/i)?.[1]?.trim();
  if (customerMatch) {
    patch.nombre_cliente = customerMatch;
  }

  const productMatch = text.match(/\bproducto\s*(?:a|=|:)\s*([^,.;\n]+)/i)?.[1]?.trim();
  if (productMatch) {
    patch.producto = productMatch;
  }

  const addressMatch = text.match(/\bdireccion\s*(?:a|=|:)\s*([^,;\n]+)/i)?.[1]?.trim();
  if (addressMatch) {
    patch.direccion = addressMatch;
  }

  const notesMatch = text.match(/\b(?:nota|notas)\s*(?:a|=|:)\s*(.+)$/i)?.[1]?.trim();
  if (notesMatch) {
    patch.notas = notesMatch;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

export function extractOrderUpdatePatch(text: string): { patch?: Record<string, unknown>; jsonInvalid: boolean } {
  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return { jsonInvalid: true };
  }

  let patch: Record<string, unknown> | undefined;
  if (inline.ok === true) {
    const payload = inline.value;
    if (isObjectRecord(payload.patch)) {
      patch = { ...payload.patch };
    } else {
      const filteredEntries = Object.entries(payload).filter(([key]) => ORDER_UPDATE_PATCH_FIELDS.has(key));
      if (filteredEntries.length > 0) {
        patch = Object.fromEntries(filteredEntries);
      }
    }
  }

  if (!patch) {
    patch = parseOrderUpdatePatchFromText(text);
  }

  return {
    patch,
    jsonInvalid: false
  };
}

export function parseOrderUpdateRequest(text: string): MutationParseDraft {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasMutationVerb = /\b(actualiza|actualizar|actualizacion|modifica|modificar|cambia|cambiar)\b/.test(normalized);
  if (!hasOrderWord || !hasMutationVerb) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_payload_json_invalid" }
    };
  }

  const reference: OrderUpdateReference = {};
  let patch: Record<string, unknown> | undefined;

  if (inline.ok === true) {
    const payload = inline.value;

    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }

    const extracted = extractOrderUpdatePatch(text);
    patch = extracted.patch;
  } else {
    patch = parseOrderUpdatePatchFromText(text);
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_reference_missing" }
    };
  }

  if (!patch || Object.keys(patch).length === 0) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_patch_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference,
        patch
      }
    }
  };
}

export function parseOrderCancelRequest(text: string): MutationParseDraft {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasCancelVerb = /\b(cancela|cancelar|cancelame|anula|anular)\b/.test(normalized);
  if (!hasOrderWord || !hasCancelVerb) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_cancel_payload_json_invalid" }
    };
  }

  const reference: OrderCancelReference = {};
  let motivo = text.match(/\bmotivo\s*[:=]\s*(.+)$/i)?.[1]?.trim();

  if (inline.ok === true) {
    const payload = inline.value;

    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }

    const motivoInline = trimString(payload.motivo);
    if (motivoInline) motivo = motivoInline;
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "order_cancel_reference_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference,
        ...(motivo ? { motivo } : {})
      }
    }
  };
}

function parsePaymentAmountFromText(text: string): number | undefined {
  const amountMatch = text.match(/\b(?:monto|abono|pago)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i);
  if (!amountMatch?.[1]) return undefined;
  const parsed = Number(amountMatch[1].replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parsePaymentRecordRequest(text: string): MutationParseDraft {
  const normalized = normalizeForMatch(text);
  const hasOrderWord = /\bpedidos?\b/.test(normalized);
  const hasMutationVerb = /\b(registra|registrar|marca|marcar|aplica|aplicar|abona|abonar|liquida|liquidar)\b/.test(normalized);
  const hasPaymentHint = /\b(pago|abono|liquidacion)\b/.test(normalized) || /\bestado\s+de\s+pago\b/.test(normalized);
  if (!hasOrderWord || !hasMutationVerb || !hasPaymentHint) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_payload_json_invalid" }
    };
  }

  const reference: PaymentRecordReference = {};
  let payment: Record<string, unknown> | undefined;

  if (inline.ok === true) {
    const payload = inline.value;
    if (isObjectRecord(payload.patch)) {
      return { matched: false };
    }

    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }

    if (isObjectRecord(payload.payment)) {
      payment = { ...payload.payment };
    } else {
      const inlinePayment: Record<string, unknown> = {};
      const inlineEstado = trimString(payload.estado_pago);
      if (inlineEstado) inlinePayment.estado_pago = inlineEstado;

      const inlineMetodo = trimString(payload.metodo);
      if (inlineMetodo) inlinePayment.metodo = inlineMetodo;

      if (payload.monto != null && String(payload.monto).trim() !== "") {
        inlinePayment.monto = payload.monto;
      }

      const inlineNotas = trimString(payload.notas);
      if (inlineNotas) inlinePayment.notas = inlineNotas;

      if (Object.keys(inlinePayment).length > 0) payment = inlinePayment;
    }
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_reference_missing" }
    };
  }

  if (!payment) {
    payment = {};
    const estadoPago = normalized.match(/\b(pagado|pendiente|parcial)\b/)?.[1];
    if (estadoPago) {
      payment.estado_pago = estadoPago;
    }

    const monto = parsePaymentAmountFromText(text);
    if (monto != null) {
      payment.monto = monto;
    }

    const metodo = normalized.match(/\b(efectivo|transferencia|tarjeta|otro)\b/)?.[1];
    if (metodo) {
      payment.metodo = metodo;
    }

    const nota = text.match(/\bnota\s*[:=]\s*(.+)$/i)?.[1]?.trim();
    if (nota) {
      payment.notas = nota;
    }
  }

  if (typeof payment.estado_pago !== "string" || payment.estado_pago.trim().length === 0) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_estado_pago_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference,
        payment
      }
    }
  };
}

export function parseInventoryConsumeRequest(text: string): MutationParseDraft {
  const normalized = normalizeForMatch(text);
  const hasConsumeVerb = /\b(consume|consumir|descuenta|descontar|aplica|aplicar)\b/.test(normalized) || /\binventory\.consume\b/.test(normalized);
  const hasInventoryHint = /\b(inventario|insumos?)\b/.test(normalized) || /\binventory\.consume\b/.test(normalized);
  if (!hasConsumeVerb || !hasInventoryHint) {
    return { matched: false };
  }

  const inline = parseInlineJsonObject(text.trim());
  if (inline.ok === false) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "inventory_consume_payload_json_invalid" }
    };
  }

  const reference: InventoryConsumeReference = {};
  if (inline.ok === true) {
    const payload = inline.value;
    if (isObjectRecord(payload.reference)) {
      reference.folio = sanitizeOrderReferenceValue(payload.reference.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.reference.operation_id_ref);
    } else {
      reference.folio = sanitizeOrderReferenceValue(payload.folio);
      reference.operation_id_ref = sanitizeOrderReferenceValue(payload.operation_id_ref);
    }
  }

  const fromText = extractOrderReferenceFromText(text);
  if (!reference.folio) reference.folio = fromText.folio;
  if (!reference.operation_id_ref) reference.operation_id_ref = fromText.operation_id_ref;

  if (!reference.folio && !reference.operation_id_ref) {
    return {
      matched: true,
      result: { ok: false, source: "fallback", error: "inventory_consume_reference_missing" }
    };
  }

  return {
    matched: true,
    result: {
      ok: true,
      source: "fallback",
      payload: {
        reference
      }
    }
  };
}
