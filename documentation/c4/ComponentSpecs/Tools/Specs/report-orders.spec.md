# Spec - report-orders (Phase 3 reporting v3)

Status: MVP
Last Updated: 2026-03-09

## Objective
Read order rows from Google Sheets and return operational summaries filtered by day/week/month/year periods.
It must query data only and must not mutate orders or confirmation state.

## Inputs
- `period`:
  - `day`: exact `dateKey` (`YYYY-MM-DD`) + user-facing label
  - `week`: week containing an anchor date (`anchorDateKey`) + label
  - `month`: exact `year` + `month` + label
  - `year`: exact `year` + label
- Backward-compatible legacy period shortcuts supported internally:
  - `today`
  - `tomorrow`
  - `week`
- `timezone`: default `America/Mexico_City`
- Google Workspace CLI configuration:
  - command + optional args
  - spreadsheet id
  - read range
  - timeout/retries

## Outputs
- Structured report:
  - `period`
  - `timezone`
  - `total`
  - `orders[]` (minimal order preview fields)
- Deterministic errors (`order_report_*`) on transport/config failures.

## Rules
- Source of truth is Google Sheets `Pedidos` rows (read-only).
- Query via `googleworkspace/cli` (`gws`) using `sheets spreadsheets values get`.
- Support header row in first line and ignore it in result mapping.
- Filter orders by delivery datetime using `fecha_hora_entrega_iso` when available; fallback to `fecha_hora_entrega`.
- Day filter matches exact `dateKey`.
- Week filter matches Monday-Sunday window from `anchorDateKey` in configured timezone.
- Month filter matches exact `year` + `month`.
- Year filter matches exact `year`.
- Return rows sorted by delivery date/time (best effort).
- Never include secrets/tokens in user-facing errors.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network issues
  - rate limit / 5xx style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id
  - missing/invalid range after normalization
  - invalid period payload
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `normalizes_append_like_range_to_read_range`
- `filters_orders_for_day`
- `filters_orders_for_week`
- `filters_orders_for_month`
- `filters_orders_for_year`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
