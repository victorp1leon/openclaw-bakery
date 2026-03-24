# Spec - admin-health (Phase 6 admin operations)

Status: MVP
Last Updated: 2026-03-23

## Objective
Expose a read-only admin health capability (`admin.health`) for runtime operations.
It must reuse `runHealthcheck` as source of truth and return a sanitized, traceable summary.

## Inputs
- `chat_id: string`
- runtime dependencies:
  - resolved `AppConfig`
  - `allowlistSize`
  - `dbOpen` / `dbPath`

## Outputs
- `status: ok|degraded|error`
- `checks[]`:
  - `name`
  - `status: ok|degraded|error`
  - `detail` (sanitized)
- `trace_ref`
- `detail`
- `generated_at`

## Business Rules
- Must not mutate external systems or local business state.
- Must map health statuses:
  - `ok -> ok`
  - `warn -> degraded`
  - `fail -> error`
- Must include deterministic `trace_ref` (`admin-health:<id>`).
- Must sanitize sensitive tokens/keys in check details before returning.
- Must cap returned checks to a bounded size to keep replies concise.

## Error Handling Classification
- Retriable: transient runtime/db read failures.
- Non-retriable: invalid internal config for health assembly.

## Security Constraints
- Never expose tokens/secrets/credentials in `detail` or `checks[].detail`.
- Keep output operational and minimal; no stack traces in user-visible responses.

## Idempotency / Dedupe
- Not applicable (read-only query, no side effects).

## Test Cases
- `maps_health_status_to_admin_status`
- `redacts_sensitive_detail_tokens`
- `returns_trace_ref_and_generated_at`
