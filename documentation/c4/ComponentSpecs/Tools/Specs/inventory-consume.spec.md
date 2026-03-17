# Spec - inventory-consume (Phase 3 inventory mutation)

Status: MVP
Last Updated: 2026-03-17

## Objective
Consume inventory supplies for a confirmed order by decrementing stock in `Inventario`
and appending auditable movements in `MovimientosInventario`.
This adapter is a mutation and must execute only behind confirm flow.

## Inputs
- `operation_id: string` (inventory consume operation id)
- `chat_id: string`
- `reference`:
  - `folio?: string`
  - `operation_id_ref?: string`
- Google Workspace CLI config:
  - command + optional args
  - spreadsheet id
  - read ranges:
    - orders (`Pedidos`)
    - recipes (`CatalogoRecetas`, when source=`gws`)
    - inventory tabs (`Inventario`, `MovimientosInventario`)
  - timeout/retries
- Recipe source:
  - `inline` (smoke/mock safety)
  - `gws` (live recipe catalog)
- Unit conversion policy:
  - mandatory `g <-> kg` conversion table
  - canonical arithmetic unit: grams
  - rounding: half-up in grams for internal arithmetic
- Mutation policy flags:
  - `allow_negative_stock` (default `false`)

## Outputs
- Structured mutation result:
  - `reference`
  - `order_row_index`
  - `consumed[]`:
    - `insumo`
    - `unidad`
    - `delta_cantidad`
    - `stock_antes`
    - `stock_despues`
  - `movements_written`
  - `idempotent_replay` (when previously consumed)
  - `detail`
- Deterministic errors (`inventory_consume_*`) for validation/config/provider failures.

## Rules
- Resolve exactly one order row by `folio` or `operation_id_ref`.
- If `folio` and `operation_id_ref` are both present and do not point to the same row, fail deterministically (`inventory_consume_reference_ambiguous`).
- Reject mutation when order `estado_pedido=cancelado` (source of truth for cancellation).
- Build consumption lines from order payload + recipe profiles:
  - same recipe schema used by `shopping.list.generate`
  - aggregate by normalized `insumo + unidad`.
- Recipe coverage is all-or-nothing:
  - if any order line cannot be mapped to a recipe profile, fail deterministically (`inventory_consume_recipe_not_found`).
- Unit conversion is mandatory for `g <-> kg`:
  - normalize recipe and inventory quantities to grams for arithmetic.
  - when inventory base unit is `kg`, convert grams back to `kg` with half-up rounding before writing `stock_actual`/movement quantities.
  - unsupported units or conversion paths must fail deterministically (`inventory_consume_unit_not_supported`).
- Match each required supply against active inventory rows in `Inventario`.
- If an inventory item is missing or inactive, fail deterministically (`inventory_consume_supply_not_found`).
- If `allow_negative_stock=false` and resulting stock would be `< 0`, fail deterministically (`inventory_consume_insufficient_stock`).
- Idempotency:
  - before mutating, check `MovimientosInventario` for existing consume entries by `operation_id` + `order_ref`.
  - if already applied, return deterministic no-op with `idempotent_replay=true` and user-facing detail `Consumo ya aplicado para <folio>. operation_id: <operation_id>`.
- Write path:
  - update target `stock_actual` values in `Inventario`.
  - append one row per consumed supply in `MovimientosInventario` with:
    - `movimiento_id`, `operation_id`, `order_ref`, `evento=consume`,
    - `insumo_id`, `delta_cantidad`, `stock_antes`, `stock_despues`, `unidad`, `created_at`.
- If any provider error happens after partial writes, return controlled `inventory_consume_partial_failure`
  with reconciliation detail for manual recovery including:
  - `order_ref`
  - `consumed_applied[]`
  - `consumed_pending[]`
  - `detected_at`

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network failures
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id/range
  - invalid reference payload
  - order not found / ambiguous
  - `folio` + `operation_id_ref` conflict
  - canceled order consume attempt
  - recipe not found for any order line
  - unsupported unit conversion
  - missing/inactive inventory supply
  - insufficient stock when negative stock is disallowed
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload
  - partial failure requiring reconciliation

## Security Constraints
- Must not execute without runtime confirmation guard.
- Must not expose credentials or raw command env in user-visible responses.
- Error tokens and logs must be sanitized.
- Keep movement rows traceable (`operation_id`, `order_ref`) without storing secrets.

## Idempotency / Dedupe
- `operation_id` is the mutation idempotency key.
- Retried execution with the same `operation_id` must be no-op when movement rows already exist.
- Dedupe should prevent duplicate consume operations for identical order reference in short windows.

## Test Cases
- `fails_when_reference_missing`
- `fails_when_order_not_found`
- `fails_when_order_reference_is_ambiguous`
- `fails_when_folio_and_operation_id_ref_conflict`
- `rejects_consume_for_canceled_order`
- `fails_when_recipe_is_missing_for_any_order_line`
- `fails_when_unit_conversion_is_not_supported`
- `fails_when_supply_is_missing_or_inactive`
- `fails_when_stock_is_insufficient_and_negative_not_allowed`
- `normalizes_grams_and_kilograms_using_half_up_rounding`
- `consumes_inventory_and_writes_movements`
- `returns_idempotent_noop_when_operation_already_consumed`
- `returns_idempotent_noop_message_for_replay`
- `returns_reconciliation_detail_on_partial_failure`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
