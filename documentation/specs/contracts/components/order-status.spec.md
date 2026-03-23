> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/order-status.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - order-status (Phase 3 lifecycle query)

Status: MVP
Last Updated: 2026-03-17

## Objective
Return read-only status for an order using Sheets `Pedidos` data.
This adapter must not mutate orders and must not require confirmation flow.

## Inputs
- `query`: free-text key (folio, operation id, customer, product)
- `timezone`: default `America/Mexico_City`
- `limit`: optional bounded max rows
- Google Workspace CLI config:
  - command + args
  - spreadsheet id
  - read range (`Pedidos!A:U`)
  - timeout/retries
  - `limit` configurable via runtime (`ORDER_STATUS_LIMIT`, default 10)

## Outputs
- Structured status result:
  - `query`
  - `timezone`
  - `total`
  - `orders[]` with:
    - `folio`
    - `fecha_hora_entrega`
    - `nombre_cliente`
    - `producto`
    - `estado_pago`
    - `estado_operativo` (`programado|hoy|atrasado|cancelado`)
    - `notas`
  - `trace_ref` (visible support reference)
  - `detail`
- Deterministic errors (`order_status_*`) on validation/config/provider failures.

## Rules
- Source of truth is Google Sheets `Pedidos` rows (read-only).
- Query via `gws` using `sheets spreadsheets values get`.
- Support header row in first line and ignore it in mapping.
- Matching must be accent-insensitive and case-insensitive.
- Derive `estado_operativo`:
  - `cancelado` if `estado_pedido=cancelado` (highest priority)
  - `cancelado` if `notas` contains marker `[CANCELADO]`
  - `hoy` if delivery date equals current local date
  - `atrasado` if delivery date is before current local date
  - `programado` otherwise
- Ranking:
  - exact `folio|operation_id` matches first
  - then recency (most recent delivery first)
- `total` must represent full matches before truncation and `orders[]` must respect configured limit.
- Never include secrets/tokens in user-facing errors.

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network issues
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id/range
  - invalid query
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `returns_status_for_exact_folio_match`
- `returns_status_for_customer_query`
- `derives_cancelado_when_cancel_marker_exists`
- `derives_hoy_when_delivery_is_today`
- `derives_atrasado_when_delivery_is_past`
- `returns_empty_when_no_match`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
