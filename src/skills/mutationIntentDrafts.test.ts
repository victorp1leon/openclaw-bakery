import { describe, expect, it } from "vitest";

import {
  extractOrderReferenceFromText,
  hasOrderReference,
  inventoryOrderRefLabel,
  parseInventoryConsumeRequest,
  parseOrderCancelRequest,
  parseOrderUpdateRequest,
  parsePaymentRecordRequest,
  referenceFromFreeText
} from "./mutationIntentDrafts";

describe("mutationIntentDrafts", () => {
  it("parseOrderUpdateRequest returns matched false for non-mutation text", () => {
    const draft = parseOrderUpdateRequest("hola, como estas");
    expect(draft.matched).toBe(false);
  });

  it("parseOrderUpdateRequest parses natural language patch", () => {
    const draft = parseOrderUpdateRequest("actualiza pedido folio op-123 cambia cantidad a 3");
    expect(draft.matched).toBe(true);
    if (draft.matched && draft.result.ok) {
      expect(draft.result.payload.reference).toEqual({ folio: "op-123", operation_id_ref: undefined });
      expect(draft.result.payload.patch).toEqual({ cantidad: 3 });
    }
  });

  it("parseOrderUpdateRequest fails when reference is missing", () => {
    const draft = parseOrderUpdateRequest("actualiza pedido cambia cantidad a 3");
    expect(draft).toEqual({
      matched: true,
      result: { ok: false, source: "fallback", error: "order_update_reference_missing" }
    });
  });

  it("parseOrderCancelRequest parses motivo from text", () => {
    const draft = parseOrderCancelRequest("cancela pedido folio op-123 motivo: cliente cancelo");
    expect(draft.matched).toBe(true);
    if (draft.matched && draft.result.ok) {
      expect(draft.result.payload.reference).toEqual({ folio: "op-123", operation_id_ref: undefined });
      expect(draft.result.payload.motivo).toBe("cliente cancelo");
    }
  });

  it("parsePaymentRecordRequest asks for estado_pago when missing", () => {
    const draft = parsePaymentRecordRequest("registra pago del pedido folio op-123");
    expect(draft).toEqual({
      matched: true,
      result: { ok: false, source: "fallback", error: "payment_record_estado_pago_missing" }
    });
  });

  it("parsePaymentRecordRequest parses inline json payment", () => {
    const draft = parsePaymentRecordRequest(
      'registra pago del pedido folio op-123 {"payment":{"estado_pago":"parcial","monto":350,"metodo":"transferencia"}}'
    );
    expect(draft.matched).toBe(true);
    if (draft.matched && draft.result.ok) {
      expect(draft.result.payload.reference).toEqual({ folio: "op-123", operation_id_ref: undefined });
      expect(draft.result.payload.payment).toEqual({
        estado_pago: "parcial",
        monto: 350,
        metodo: "transferencia"
      });
    }
  });

  it("parseInventoryConsumeRequest returns missing reference when needed", () => {
    const draft = parseInventoryConsumeRequest("consume inventario del pedido");
    expect(draft).toEqual({
      matched: true,
      result: { ok: false, source: "fallback", error: "inventory_consume_reference_missing" }
    });
  });

  it("parseInventoryConsumeRequest parses operation_id reference", () => {
    const draft = parseInventoryConsumeRequest("consume inventario del pedido operation_id op-abc-9");
    expect(draft.matched).toBe(true);
    if (draft.matched && draft.result.ok) {
      expect(draft.result.payload.reference).toEqual({ folio: undefined, operation_id_ref: "op-abc-9" });
    }
  });

  it("extractOrderReferenceFromText supports folio and operation id", () => {
    const reference = extractOrderReferenceFromText("folio op-12 operation_id op-99");
    expect(reference).toEqual({ folio: "op-12", operation_id_ref: "op-99" });
  });

  it("referenceFromFreeText falls back to direct token", () => {
    const reference = referenceFromFreeText("op-directo-777");
    expect(reference).toEqual({ folio: "op-directo-777" });
  });

  it("hasOrderReference validates known keys", () => {
    expect(hasOrderReference({ folio: "op-123" })).toBe(true);
    expect(hasOrderReference({ operation_id_ref: "op-999" })).toBe(true);
    expect(hasOrderReference({})).toBe(false);
  });

  it("inventoryOrderRefLabel returns folio then operation id", () => {
    expect(inventoryOrderRefLabel({ reference: { folio: "op-f-1" } })).toBe("op-f-1");
    expect(inventoryOrderRefLabel({ reference: { operation_id_ref: "op-id-1" } })).toBe("op-id-1");
    expect(inventoryOrderRefLabel({})).toBe("pedido");
  });
});
