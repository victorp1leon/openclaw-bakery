# Spec - append-order (Phase 3 connector-ready + gws-only sheets)

Status: MVP
Last Updated: 2026-03-17

## Objective
Append a confirmed order row to Google Sheets.
This adapter handles external order export only and must not bypass confirmation/authorization flow.
The adapter uses `gws` (`googleworkspace/cli`) as the only Google Sheets integration path.

## Contract
### Input
- `operation_id: string`
- `chat_id: string`
- `payload: Order`
- `dryRun?: boolean` (defaults to adapter config; safe default is `true`)

### Output
- `ToolExecutionResult<Order & { chat_id: string }>`

## Rules
- Include `operation_id` in outbound payload and result for traceability.
- Include `chat_id` in emitted payload/result for downstream auditing.
- Map order payload to stable external row schema/column order.
- Keep `fecha_hora_entrega` as free-text source and also emit `fecha_hora_entrega_iso` (normalized local datetime) when inferable.
- In live mode (`dryRun=false`), require `gws` command, spreadsheet id, and target range.
- Apply controlled timeout and bounded retry policy.
- Retry only on transport transient failures and retriable statuses (`429`, `5xx`).
- Do not retry deterministic `4xx` responses.

## Error Handling
- Timeout/network failures are retriable (bounded attempts).
- Mapping/validation failures are non-retriable.
- Deterministic upstream `4xx` errors are non-retriable.
- Missing live `gws` config (`spreadsheetId`/`range`) is non-retriable.

## Error Handling Classification
- Retriable: timeout/network/transient upstream availability failures, `429`, `5xx`.
- Non-retriable: invalid mapping/payload, deterministic downstream errors, and missing live `gws` config.

## Security Constraints
- No execution without prior runtime confirmation gate.
- Do not expose credentials/tokens or raw auth headers in logs/details.
- Return sanitized connector errors only.

## Idempotency / Dedupe
- Propagate `operation_id` downstream for idempotent append semantics.
- Repeated execution attempts for same `operation_id` should resolve deterministically when downstream supports dedupe.

## Timeout and Retry Policy
- Bounded request timeout per call.
- Bounded retries for transient failures only.
- No infinite retries.
- Default connector policy: `timeoutMs=30000`, `maxRetries=2` (hasta 3 intentos totales).

## Idempotency Strategy
- Use `operation_id` as canonical idempotency key across runtime and downstream append requests.
- Runtime/state dedupe remains primary; downstream dedupe is required safety net.

## External Error Mapping
- `timeout` / transport abort: retriable
- `network` unavailable/reset: retriable (bounded retries)
- `429` upstream throttling: retriable (bounded retries)
- `5xx` upstream failures: retriable (bounded retries)
- `4xx` business/validation/auth errors: non-retriable
- missing `gws` config in live mode: non-retriable

## Dry-Run Behavior
- Supported and enabled by default.
- Dry-run returns structured result without external side effects.
- Turning dry-run off is allowed only when command + spreadsheet id + range are configured.

## Test Cases
- `returns_dry_run_by_default`
- `fails_when_live_without_spreadsheet_id`
- `fails_when_gws_live_without_range`
- `executes_gws_append_when_provider_gws_is_configured`
- `retries_gws_on_timeout`
