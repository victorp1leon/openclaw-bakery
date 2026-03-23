> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/Tools/Specs/cancel-order.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - cancel-order (Phase 3 lifecycle)

Status: MVP
Last Updated: 2026-03-17

## Objective
Cancel an existing order without deleting history while keeping Trello + Google Sheets consistent.
Cancellation must be explicit, auditable, idempotent, and rollback-safe.

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
  - read range (`Pedidos!A:U`)
  - timeout/retries
- Trello sync config:
  - api key + token
  - cancel list id (`Pedidos - Cancelados`)
  - api base URL
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
- Consistency rule: Trello and Google Sheets must both succeed for cancellation to be successful.
- Resolve exactly one row by `folio` or `operation_id_ref`.
- If no unique match, fail deterministically (`not_found` / `ambiguous`).
- Never hard-delete the row.
- Move Trello card to the configured cancel list and append cancel comment.
- Represent cancellation as a marker appended to `notas`:
  - `[CANCELADO] <timestamp> op:<operation_id> chat:<chat_id> motivo:<motivo|n/a>`
- Set `estado_pedido=cancelado` in Sheets row.
- If marker already exists, treat as idempotent success (`already_canceled=true`) and avoid duplicate marker insertion.
- Reject cancellation for terminal statuses (`estado_pedido=entregado|completado`).
- Keep original `folio` and order payload fields unchanged.
- Persist update via `gws` on exact target row range (`A:U` for that row).
- If Sheets write fails after Trello move, rollback Trello card to previous snapshot and fail operation.
- If Trello cancellation fails after partial mutation, rollback Trello card internally and fail operation.

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

## Timeout and Retry Policy
- Bounded request timeout per call.
- Bounded retries for transient failures only.
- Default connector policy: `timeoutMs=30000`, `maxRetries=2` (hasta 3 intentos totales).

## Test Cases
- `fails_when_reference_missing`
- `fails_when_order_not_found`
- `fails_when_order_reference_is_ambiguous`
- `appends_cancel_marker_to_notas`
- `returns_already_canceled_true_when_marker_exists`
- `retries_on_transient_gws_failure_then_succeeds`
- `fails_when_gws_command_unavailable`
