> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/lookup-order.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - lookup-order (Phase 3 query skill)

Status: MVP
Last Updated: 2026-03-17

## Objective
Read order rows from Google Sheets and return matches for a free-text lookup query (folio, operation id, customer name, product).
It must query data only and must not mutate orders or confirmation state.

## Inputs
- `query`: free-text lookup key from user request.
- `limit`: optional max rows in response (default `10`, configurable via `ORDER_LOOKUP_LIMIT`).
- `timezone`: default `America/Mexico_City`.
- Google Workspace CLI configuration:
  - command + optional args
  - spreadsheet id
  - read range
  - timeout/retries

## Outputs
- Structured lookup result:
  - `query`
  - `timezone`
  - `total`
  - `orders[]` (preview fields)
  - `trace_ref`
- Deterministic errors (`order_lookup_*`) on transport/config failures.

## Rules
- Source of truth is Google Sheets `Pedidos` rows (read-only).
- Query via `googleworkspace/cli` (`gws`) using `sheets spreadsheets values get`.
- Support header row in first line and ignore it in result mapping.
- Match should consider at least:
  - `folio`
  - `operation_id`
  - `nombre_cliente`
  - `producto`
- Matching must be accent-insensitive and case-insensitive.
- Reject short/noisy queries without meaningful tokens (`order_lookup_query_invalid`).
- Prioritize exact `folio`/`operation_id` matches first; then sort by recency (best effort).
- `total` must represent full matches before truncation; `orders[]` is capped by `limit`.
- Generate deterministic `trace_ref` for support and runtime traceability.
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
  - invalid lookup query

## Security Constraints
- No write operations against Sheets in this tool.
- No logging of credentials or full command env.
- Error tokens must be sanitized before surfacing upstream.

## Test Cases
- `fails_when_spreadsheet_id_missing`
- `returns_matches_for_customer_name`
- `returns_matches_for_folio`
- `returns_matches_for_operation_id`
- `returns_empty_when_no_match`
- `limits_results_to_10_by_default_and_preserves_total_count`
- `prioritizes_exact_folio_or_operation_id_before_recency_sort`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
- `fails_for_noisy_query_without_meaningful_tokens`
