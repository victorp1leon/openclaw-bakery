# Spec - shopping-list-generate (Phase 3 operations)

Status: MVP
Last Updated: 2026-03-13

## Objective
Build a read-only shopping/supplies list suggestion for one or more orders using Google Sheets `Pedidos` rows.
It must not mutate orders, inventory, or confirmation state.

## Inputs
- `scope`:
  - `day`: exact `dateKey` (`YYYY-MM-DD`) + label
  - `week`: anchor date key (`YYYY-MM-DD`) + label
  - `order_ref`: exact `folio|operation_id_ref` + label
  - `lookup`: free-text lookup query + label
- `timezone`: default `America/Mexico_City`
- Google Workspace CLI configuration:
  - command + optional args
  - spreadsheet id
  - read range
  - timeout/retries

## Outputs
- Structured shopping list result:
  - `scope`
  - `timezone`
  - `totalOrders`
  - `orders[]` (minimal order preview)
  - `products[]` (aggregated quantities by product)
  - `supplies[]` (suggested insumos aggregation)
  - `assumptions[]`
  - `detail`
- Deterministic errors (`shopping_list_*`) for config/provider/lookup failures.

## Rules
- Source of truth is Google Sheets `Pedidos` rows (read-only).
- Query via `googleworkspace/cli` (`gws`) using `sheets spreadsheets values get`.
- Header row in first line is optional and must be ignored when present.
- Date filtering uses `fecha_hora_entrega_iso` when available; fallback to `fecha_hora_entrega`.
- `order_ref` matching is exact over `folio` or `operation_id`.
- `lookup` matching is accent-insensitive/case-insensitive over `folio`, `operation_id`, `nombre_cliente`, and `producto`.
- Supplies list is suggestion-only and must include explicit assumptions when heuristics/default recipes are used.
- Never expose credentials/tokens in user-facing messages.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network failures
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id
  - invalid scope payload
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `filters_orders_by_day_week_and_order_reference`
- `matches_lookup_query_accent_insensitive`
- `aggregates_products_and_supplies`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
