# Spec - dedupeGuard

Status: MVP
Last Updated: 2026-02-26

## Objective
Register pending confirmable operations with a derived idempotency key and reject duplicates before confirmation/execution.
It must only perform dedupe/idempotency registration and must not execute tools.

## Current Implementation
- `registerPendingWithDedupe(...)` composes:
  - `buildIdempotencyKey(...)`
  - `registerPendingOperation(...)`

## Inputs
- `operation_id`
- `chat_id`
- `intent` (`gasto` | `pedido`)
- `payload`
- `timestampMs?` (for dedupe-window/idempotency key derivation)

## Outputs
- `{ ok: true, idempotency_key }`
- `{ ok: false, duplicate_of }`

## Rules
- Build an idempotency key from conversational context + payload (via state layer helpers).
- Register pending operation before showing confirmation summary as the dedupe gate.
- Return existing operation metadata when a duplicate is detected.
- Do not mutate payload contents in the dedupe guard.

## Error Handling Classification
- Retriable: transient persistence failures may be retried by caller policy.
- Non-retriable: confirmed duplicate detection (`ok: false`) is deterministic and should not retry execution.

## Security Constraints
- Dedupe key derivation must not expose sensitive payload values in logs.
- Duplicate handling must preserve traceability (`operation_id` / existing record metadata).

## Idempotency / Dedupe
- Core responsibility of this component; dedupe window and key strategy must be deterministic.
- Repeated equivalent operations must map to the same logical duplicate decision path.

## Test Cases
- `returns_idempotency_key_for_new_pending_operation`
- `returns_duplicate_when_same_payload_repeated_within_window`
- `preserves_original_duplicate_operation_metadata`
