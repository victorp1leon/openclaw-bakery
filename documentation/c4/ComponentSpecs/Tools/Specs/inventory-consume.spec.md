# Spec - inventory-consume (Phase 3 inventory mutation)

Status: MVP
Last Updated: 2026-03-13

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
- Reject mutation when order is canceled (`[CANCELADO]` marker or `estado_pedido=cancelado`).
- Build consumption lines from order payload + recipe profiles:
  - same recipe schema used by `shopping.list.generate`
  - aggregate by normalized `insumo + unidad`.
- Match each required supply against active inventory rows in `Inventario`.
- If an inventory item is missing or inactive, fail deterministically (`inventory_consume_supply_not_found`).
- If `allow_negative_stock=false` and resulting stock would be `< 0`, fail deterministically (`inventory_consume_insufficient_stock`).
- Idempotency:
  - before mutating, check `MovimientosInventario` for existing consume entries by `operation_id` + `order_ref`.
  - if already applied, return deterministic no-op with `idempotent_replay=true`.
- Write path:
  - update target `stock_actual` values in `Inventario`.
  - append one row per consumed supply in `MovimientosInventario` with:
    - `movimiento_id`, `operation_id`, `order_ref`, `evento=consume`,
    - `insumo_id`, `delta_cantidad`, `stock_antes`, `stock_despues`, `unidad`, `created_at`.
- If any provider error happens after partial writes, return controlled `inventory_consume_partial_failure`
  with reconciliation detail for manual recovery.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network failures
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id/range
  - invalid reference payload
  - order not found / ambiguous
  - canceled order consume attempt
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
- `rejects_consume_for_canceled_order`
- `fails_when_supply_is_missing_or_inactive`
- `fails_when_stock_is_insufficient_and_negative_not_allowed`
- `consumes_inventory_and_writes_movements`
- `returns_idempotent_noop_when_operation_already_consumed`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
