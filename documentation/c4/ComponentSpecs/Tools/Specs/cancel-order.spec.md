# Spec - cancel-order (Phase 3 lifecycle)

Status: Draft
Last Updated: 2026-03-09

## Objective
Cancel an existing order in Google Sheets (`Pedidos`) without deleting history.
Cancellation must be explicit, auditable, and idempotent.

## Inputs
- `operation_id: string` (cancel operation id)
- `chat_id: string`
- `reference`:
  - `folio?: string`
  - `operation_id_ref?: string`
- `motivo?: string`
- Google Workspace CLI config:
  - command + args
  - spreadsheet id
  - read range (`Pedidos!A:R`)
  - timeout/retries

## Outputs
- Structured result:
  - `reference`
  - `matched_row_index`
  - `already_canceled: boolean`
  - `after` (preview subset)
  - `detail`
- Deterministic errors (`order_cancel_*`) on validation/config/provider failures.

## Rules
- Source of truth is Google Sheets `Pedidos`.
- Resolve exactly one row by `folio` or `operation_id_ref`.
- If no unique match, fail deterministically (`not_found` / `ambiguous`).
- Never hard-delete the row.
- Represent cancellation as a marker appended to `notas`:
  - `[CANCELADO] <timestamp> op:<operation_id> chat:<chat_id> motivo:<motivo|n/a>`
- If marker already exists, treat as idempotent success (`already_canceled=true`) and avoid duplicate marker insertion.
- Keep original `folio` and order payload fields unchanged.
- Persist update via `gws` on exact target row range (`A:R` for that row).

## Error Handling Classification
- Retriable:
  - `gws` timeout
  - transient network issues
  - rate limit / `5xx` style failures surfaced by CLI payload
- Non-retriable:
  - missing spreadsheet id/range
  - invalid reference payload
  - row not found / ambiguous
  - command unavailable (`ENOENT`)
  - malformed non-JSON CLI payload

## Security Constraints
- Must not execute without runtime confirmation guard.
- Do not expose credentials or raw command env in logs/errors.
- Return sanitized error tokens only.

## Idempotency / Dedupe
- Use `operation_id` as idempotency key for this mutation.
- Repeated cancellation attempts over already canceled row must be deterministic no-op success.

## Test Cases
- `fails_when_reference_missing`
- `fails_when_order_not_found`
- `fails_when_order_reference_is_ambiguous`
- `appends_cancel_marker_to_notas`
- `returns_already_canceled_true_when_marker_exists`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`

