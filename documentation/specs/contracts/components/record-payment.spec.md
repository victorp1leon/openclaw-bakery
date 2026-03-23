> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/record-payment.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - record-payment (Phase 3 lifecycle)

Status: MVP
Last Updated: 2026-03-18

## Objective
Register a payment movement for an existing order in Sheets `Pedidos`.
This adapter mutates payment fields and must preserve an auditable movement trail.

## Inputs
- `operation_id: string` (payment operation id)
- `chat_id: string`
- `reference`:
  - `folio?: string`
  - `operation_id_ref?: string`
- `payment`:
  - `estado_pago`: `pagado | pendiente | parcial` (required)
  - `monto?: number`
  - `metodo?: efectivo | transferencia | tarjeta | otro`
  - `notas?: string`
- Google Workspace CLI config:
  - command + args
  - spreadsheet id
  - read range (`Pedidos!A:U`)
  - timeout/retries

## Outputs
- Structured result:
  - `reference`
  - `matched_row_index`
  - `before.estado_pago`
  - `after.estado_pago`
  - `payment_event` (normalized audit line)
  - `detail`
- Deterministic errors (`payment_record_*`) on validation/config/provider failures.

## Rules
- Source of truth is Google Sheets `Pedidos`.
- Resolve exactly one row by `folio` or `operation_id_ref`.
- If no unique match, fail deterministically (`not_found` / `ambiguous`).
- If `estado_pedido=cancelado`, reject payment mutation.
- Update column `estado_pago` with requested value.
- Append payment event to `notas`:
  - `[PAGO] <timestamp> op:<operation_id> estado:<estado_pago> monto:<monto|n/a> metodo:<metodo|n/a> nota:<notas|n/a>`
- Normalize `payment.notas` before event append (single-line, trimmed, max 160 chars).
- Persist update via `gws` on exact target row range (`A:U` for that row).
- Do not overwrite historical notes; append with line break.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network issues
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id/range
  - invalid payment payload (`estado_pago` missing/invalid, `monto<=0`)
  - row not found / ambiguous
  - canceled order mutation attempt
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- Must not execute without runtime confirmation guard.
- Do not expose credentials or raw command env in logs/errors.
- Return sanitized error tokens only.

## Idempotency / Dedupe
- Use `operation_id` as idempotency key for this mutation.
- Retried execution of same operation must avoid duplicated payment event lines when detectable.

## Test Cases
- `fails_when_reference_missing`
- `fails_when_estado_pago_missing`
- `fails_when_monto_is_non_positive`
- `fails_when_order_not_found`
- `fails_when_order_reference_is_ambiguous`
- `rejects_payment_update_for_canceled_order`
- `does_not_reject_marker_only_when_estado_pedido_not_cancelado`
- `updates_estado_pago_and_appends_payment_event`
- `normalizes_payment_notas_before_event_append`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
