# Spec - admin-logs (Phase 6 admin operations)

Status: MVP
Last Updated: 2026-03-25

## Objective
Expose a read-only admin logs capability (`admin.logs`) for operational troubleshooting.
It must query persisted runtime operations safely and return sanitized, traceable summaries.

## Inputs
- `chat_id: string` (request context)
- optional filters:
  - `filters.chat_id?: string`
  - `filters.operation_id?: string`
  - `filters.limit?: number`

## Outputs
- `status: ok`
- `filters`:
  - `chat_id?`
  - `operation_id?`
  - `limit`
- `total`
- `entries[]`:
  - `operation_id`
  - `chat_id`
  - `intent`
  - `status`
  - `payload_preview` (sanitized)
  - `created_at`
  - `updated_at`
- `trace_ref`
- `detail`
- `generated_at`

## Business Rules
- Must not mutate external systems or local business state.
- Data source is SQLite `operations` table.
- If no filter is provided by runtime, caller should default to current `chat_id`.
- `limit` must be bounded to safe range.
- `payload_preview` must be redacted for sensitive keys/tokens.
- Must include deterministic `trace_ref` (`admin-logs:<id>`).

## Error Handling Classification
- Retriable: transient SQLite read failures.
- Non-retriable: malformed internal row payload handling.

## Security Constraints
- Never expose raw secrets in `payload_preview`.
- Never expose stack traces in user-visible responses.
- Keep output operational and concise (bounded number of rows).

## Idempotency / Dedupe
- Not applicable (read-only query, no side effects).

## Test Cases
- `filters_by_chat_id_and_operation_id`
- `applies_default_limit_when_missing`
- `redacts_sensitive_payload_preview`
- `returns_trace_ref_and_generated_at`
