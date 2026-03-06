# Spec - append-expense (Phase 2 connector-ready + multi-provider sheets)

Status: MVP
Last Updated: 2026-03-05

## Objective
Add an expense row to Google Sheets after user confirmation.
It must append validated expense data only and must not bypass confirmation/authorization flow.
The adapter supports provider routing:
- `apps_script`: HTTP webhook + API key.
- `gws`: `googleworkspace/cli` command execution.

## Contract
### Input
- `operation_id: string`
- `chat_id: string`
- `payload: { fecha, monto, moneda, concepto, categoria?, metodo_pago?, proveedor?, notas? }`
- `dryRun?: boolean` (defaults to connector config, safe default is `true`)

### Output
- `ToolExecutionResult<Expense & { chat_id: string }>`

## Rules
- Include `operation_id` in outbound payload for downstream idempotency.
- Apply controlled timeout and bounded retry policy.
- Retry only on transient transport errors and retriable upstream statuses (`429`, `5xx`).
- Do not retry deterministic `4xx` errors.
- Map expense payload to stable sheet schema/column order.
- Keep dry-run enabled by default unless explicitly disabled.
- In live mode (`dryRun=false`), require provider-specific configuration:
  - `apps_script`: webhook URL and API key.
  - `gws`: command, spreadsheet id, and target range.
- In `apps_script` provider, send API key via configurable header (`x-api-key` by default).

## Error Handling
- Timeout/network failures are retriable (bounded attempts).
- Validation/mapping failures are non-retriable.
- Deterministic upstream `4xx` errors are non-retriable.
- Missing live security config (`URL`/`API key`) is non-retriable.

## Error Handling Classification
- Retriable: timeout/network/transient upstream availability failures, `429`, `5xx`.
- Non-retriable: mapping/validation errors, deterministic downstream `4xx` business errors, and missing live connector security settings.

## Security Constraints
- Do not log credentials, bearer tokens, API keys, or raw sensitive headers.
- Accept execution only for already-confirmed operations.
- Expose controlled/safe error details only.

## Idempotency / Dedupe
- Must propagate `operation_id` downstream for idempotent append semantics.
- Repeated execution attempts for same `operation_id` should resolve deterministically when downstream supports it.

## Timeout and Retry Policy
- Bounded request timeout per call.
- Bounded retries for transient failures only.
- Never use infinite retries.

## Idempotency Strategy
- Use `operation_id` as primary idempotency key across runtime and downstream append requests.
- Persist/lookup operation outcome before re-executing equivalent requests.

## External Error Mapping
- `timeout` / transport errors: retriable
- `network` unavailable/reset: retriable (bounded retries)
- `429` upstream throttling: retriable (bounded retries)
- `5xx` upstream failures: retriable (bounded retries)
- `4xx` business/validation/auth errors: non-retriable
- missing provider config in live mode: non-retriable

## Dry-Run Behavior
- Supported and enabled by default.
- Dry-run returns structured result without side effects.
- Turning dry-run off is allowed only when webhook URL and API key are configured.
  - For `gws`, dry-run off is allowed only when command + spreadsheet id + range are configured.

## Test Cases
- `returns_dry_run_by_default`
- `fails_when_dry_run_disabled_without_webhook`
- `fails_when_dry_run_disabled_without_api_key`
- `maps_expense_to_webhook_payload_and_api_key_header`
- `retries_on_retriable_http_status`
- `does_not_retry_on_non_retriable_4xx`
- `fails_when_gws_live_without_spreadsheet_id`
- `executes_gws_append_when_provider_gws_is_configured`
- `retries_gws_on_timeout`
