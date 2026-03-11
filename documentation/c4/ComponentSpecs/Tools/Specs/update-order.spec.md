# Spec - update-order (Phase 3 lifecycle)

Status: MVP
Last Updated: 2026-03-11

## Objective
Update an existing order after user confirmation while keeping Trello + Google Sheets consistent.
This lifecycle mutation must preserve traceability and idempotency, and must rollback on partial failures.

## Inputs
- `operation_id: string` (mutation operation id)
- `chat_id: string`
- `reference`:
  - `folio?: string`
  - `operation_id_ref?: string`
- `patch` (allowed mutable fields only):
  - `fecha_hora_entrega`
  - `nombre_cliente`
  - `telefono`
  - `producto`
  - `descripcion_producto`
  - `cantidad`
  - `sabor_pan`
  - `sabor_relleno`
  - `tipo_envio`
  - `direccion`
  - `estado_pago`
  - `total`
  - `moneda`
  - `notas`
- Google Workspace CLI config:
  - command + args
  - spreadsheet id
  - read range (`Pedidos!A:U`)
  - timeout/retries
- Trello sync config:
  - api key + token
  - api base URL
  - timeout/retries

## Outputs
- Structured result:
  - `reference`
  - `matched_row_index`
  - `updated_fields[]`
  - `before` (preview subset)
  - `after` (preview subset)
  - `detail`
- Deterministic errors (`order_update_*`) on validation/config/provider failures.

## Rules
- Consistency rule: Trello and Google Sheets must both succeed for the operation to be considered successful.
- Resolve exactly one row by `folio` or `operation_id_ref`.
- If no unique match, fail deterministically (`not_found` / `ambiguous`).
- Immutable columns:
  - `fecha_registro`
  - `folio`
  - `chat_id`
  - original `operation_id` column from order creation
- Apply only fields present in `patch`; no implicit overwrite to empty values.
- Re-validate shipping invariant after patch:
  - if `tipo_envio=envio_domicilio`, `direccion` is mandatory.
- If `fecha_hora_entrega` changes, recompute `fecha_hora_entrega_iso`.
- Execute Trello sync first (due/comment), then persist update via `gws` on exact target row range (`A:U` for that row).
- If Sheets write fails after Trello sync, rollback Trello card to previous snapshot and fail operation.
- If Trello update fails after partial mutation, rollback Trello card internally and fail operation.
- Append mutation audit tag to `notas`:
  - `[UPDATE] <timestamp> op:<operation_id> chat:<chat_id>`

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network issues
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id/range
  - invalid or empty `patch`
  - immutable field in patch
  - invariant violation (`direccion` missing)
  - row not found / ambiguous
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- Must not execute without runtime confirmation guard.
- Do not expose credentials or raw command env in logs/errors.
- Return sanitized error tokens only.

## Idempotency / Dedupe
- Use `operation_id` as idempotency key for this mutation.
- If the same mutation operation is retried, final row content must converge deterministically.

## Test Cases
- `fails_when_reference_missing`
- `fails_when_patch_empty`
- `fails_when_order_not_found`
- `fails_when_order_reference_is_ambiguous`
- `fails_when_patch_contains_immutable_field`
- `fails_when_shipping_invariant_breaks`
- `recomputes_fecha_hora_entrega_iso_when_delivery_changes`
- `updates_only_allowed_fields_and_preserves_others`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
