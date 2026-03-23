> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/schedule-day-view.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - schedule-day-view (Phase 3 scheduling)

Status: MVP
Last Updated: 2026-03-19

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
  - `trace_ref`
  - `totalOrders`
  - `deliveries[]` (minimal order preview sorted by delivery datetime)
  - `preparation[]` (grouped prep focus by product/quantity for the same day)
  - `suggestedPurchases[]` (catalog-driven suggestions with inline fallback by product)
  - `inconsistencies[]` (rows excluded from operational blocks due to invalid critical data)
  - `assumptions[]`
  - `detail`
- Deterministic errors (`schedule_day_view_*`) for config/provider/filter failures.

## Rules
- Source of truth is Google Sheets `Pedidos` rows (read-only).
- Query via `googleworkspace/cli` (`gws`) using `sheets spreadsheets values get`.
- Header row in first line is optional and must be ignored when present.
- Day filtering uses `fecha_hora_entrega_iso` as mandatory source of truth.
- Rows without valid `fecha_hora_entrega_iso` must not enter operational blocks and must be reported in `inconsistencies`.
- Day filter matches exact `dateKey` in configured timezone (`America/Mexico_City` by default).
- Operational blocks (`deliveries`, `preparation`, `suggestedPurchases`) must exclude canceled orders (`estado_pedido=cancelado`).
- Cancellation source of truth for this tool is strictly `estado_pedido=cancelado`.
- Legacy markers in `notas` (e.g. `[CANCELADO]`) must not be interpreted as canceled state by this tool.
- `deliveries` keeps one row per order with normalized delivery datetime and key references (`folio|operation_id`).
- Invalid/missing quantity must not fail the whole schedule:
  - keep row in `deliveries` with `cantidad_invalida=true`,
  - exclude from `preparation` and `suggestedPurchases`,
  - register inconsistency.
- `preparation` aggregates product demand for the same day to help bakery planning (no inventory mutation).
- `suggestedPurchases` is recommendation-only and must include assumptions/source when inferred by fallback.
- Recipe source policy:
  - preferred source: `CatalogoRecetas` (Google Sheets `gws`),
  - fallback: inline recipe profiles for products not mapped in catalog,
  - include source coverage in `detail` (`catalog_matches`, `fallback_matches`).
- Never expose credentials/tokens in user-facing messages.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network failures
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id
  - invalid day payload
  - malformed/empty recipe catalog when recipe source is `gws` and read succeeded
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Operational Note
- Before enabling strict cancellation behavior in live data, run a controlled cleanup/backfill for test/legacy rows in `Pedidos` so `estado_pedido` is authoritative.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `filters_orders_for_exact_day`
- `ignores_canceled_orders_in_operational_blocks`
- `does_not_treat_notes_cancel_marker_as_canceled_without_estado_pedido`
- `excludes_rows_without_iso_and_reports_inconsistencies`
- `keeps_invalid_quantity_in_deliveries_but_excludes_from_preparation_and_purchases`
- `builds_deliveries_preparation_and_suggested_purchases_with_catalog_fallback`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
