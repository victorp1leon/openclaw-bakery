# Spec - report-orders (Phase 3 reporting v1)

Status: MVP
Last Updated: 2026-03-07

## Objective
Read order rows from Google Sheets and return operational summaries filtered by period (`today`, `tomorrow`, `week`).
It must query data only and must not mutate orders or confirmation state.

## Inputs
- `period`: `today | tomorrow | week`
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
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `normalizes_append_like_range_to_read_range`
- `filters_orders_for_today`
- `filters_orders_for_tomorrow`
- `filters_orders_for_week`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
