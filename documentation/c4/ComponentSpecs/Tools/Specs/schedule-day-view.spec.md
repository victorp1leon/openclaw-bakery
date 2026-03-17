# Spec - schedule-day-view (Phase 3 scheduling)

Status: MVP
Last Updated: 2026-03-17

## Objective
Build a read-only day schedule for bakery operations using Google Sheets `Pedidos` rows.
The result must summarize deliveries, preparation focus, and suggested purchases for a single day without mutating external systems.

## Inputs
- `day`:
  - exact `dateKey` (`YYYY-MM-DD`)
  - user-facing label
- `timezone`: default `America/Mexico_City`
- Google Workspace CLI configuration:
  - command + optional args
  - spreadsheet id
  - read range
  - timeout/retries

## Outputs
- Structured schedule response:
  - `day`
  - `timezone`
  - `totalOrders`
  - `deliveries[]` (minimal order preview sorted by delivery datetime)
  - `preparation[]` (grouped prep focus by product/quantity for the same day)
  - `suggestedPurchases[]` (heuristic shopping hints derived from grouped products)
  - `assumptions[]`
  - `detail`
- Deterministic errors (`schedule_day_view_*`) for config/provider/filter failures.

## Rules
- Source of truth is Google Sheets `Pedidos` rows (read-only).
- Query via `googleworkspace/cli` (`gws`) using `sheets spreadsheets values get`.
- Header row in first line is optional and must be ignored when present.
- Day filtering uses `fecha_hora_entrega_iso` when available; fallback to `fecha_hora_entrega`.
- Day filter matches exact `dateKey` in configured timezone (`America/Mexico_City` by default).
- Operational blocks (`deliveries`, `preparation`, `suggestedPurchases`) must exclude canceled orders (`estado_pedido=cancelado`).
- `deliveries` keeps one row per order with normalized delivery datetime and key references (`folio|operation_id`).
- `preparation` aggregates product demand for the same day to help bakery planning (no inventory mutation).
- `suggestedPurchases` is recommendation-only and must include assumptions when inferred heuristically from product names/counts.
- Never expose credentials/tokens in user-facing messages.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network failures
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id
  - invalid day payload
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `filters_orders_for_exact_day`
- `ignores_canceled_orders_in_operational_blocks`
- `builds_deliveries_preparation_and_suggested_purchases`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
