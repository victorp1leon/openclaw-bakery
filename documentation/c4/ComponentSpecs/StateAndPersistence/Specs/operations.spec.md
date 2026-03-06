# Spec - operationsStore (`operations.ts`)

Status: MVP
Last Updated: 2026-03-03

## Objective
Persist operation lifecycle records used by confirmation flow, dedupe/idempotency checks, and traceability.
It must persist lifecycle state and must not execute tools or conversation decisions by itself.

## Scope
Current implementation exposes:
- `upsertOperation(...)`
- `registerPendingOperation(...)`
- `findOperationByIdempotencyKey(...)`
- `getOperation(...)`

## Contracts

### `upsertOperation`
Input:
- `operation_id: string`
- `chat_id: string`
- `intent: string`
- `payload: unknown`
- `status: pending_confirm | confirmed | canceled | executed | failed`
- `idempotency_key?: string` (defaults to `operation_id`)

Behavior:
- Inserts a new operation row or updates an existing row on `operation_id` conflict.
- Persists `payload` as JSON (`payload_json`).
- Updates `updated_at` on every upsert.

### `registerPendingOperation`
Input:
- `operation_id: string`
- `chat_id: string`
- `intent: string`
- `payload: unknown`
- `idempotency_key: string`

Output:
- `{ inserted: true, operation }` when pending operation is created.
- `{ inserted: false, operation }` when an existing operation with the same `idempotency_key` already exists.

### `findOperationByIdempotencyKey`
Input:
- `idempotency_key: string`

Output:
- `OperationRow | undefined`

### `getOperation`
Input:
- `operation_id: string`

Output:
- `OperationRow | undefined`

## Rules
- `operation_id` is the primary identity for operation lifecycle updates.
- `idempotency_key` enforces duplicate prevention for pending registrations.
- Duplicate detection must happen before creating a new `pending_confirm` record.
- Store timestamps (`created_at`, `updated_at`) in ISO format.
- On failed post-insert fetch in `registerPendingOperation`, throw a deterministic error (`operation_insert_failed:<operation_id>`).

## Error Handling
- Duplicate idempotency key is not an exception; it returns `{ inserted: false, operation }`.
- Database/storage failures should propagate as errors to callers (no silent swallow).

## Error Handling Classification
- Retriable: transient DB write/read contention or temporary storage access failures.
- Non-retriable: deterministic duplicate result for existing idempotency key.

## Security Constraints
- Persisted operation data must avoid secret-bearing fields where possible.
- Operational logs around storage failures must remain redacted/safe.

## Idempotency / Dedupe
- `idempotency_key` uniqueness enforces pending-operation dedupe.
- Re-registration of equivalent operations should deterministically return existing row metadata.

## Test Cases
- `stores_operation_result_once`
- `returns_existing_result_for_same_operation_id`
- `prevents_duplicate_pending_insert_by_idempotency_key`
- `updates_operation_status_via_upsert`
