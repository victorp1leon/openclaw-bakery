# Spec - create-card (Phase 3 connector-ready)

Status: MVP
Last Updated: 2026-03-17

## Objective
Create a Trello card for a confirmed order operation.
This adapter handles Trello integration only and must not bypass confirmation/authorization flow.

## Contract
### Input
- `operation_id: string`
- `chat_id: string`
- `payload: Order`
- `dryRun?: boolean` (defaults to adapter config; safe default is `true`)

### Output
- `ToolExecutionResult<Order & { chat_id: string; trello_card_id?: string; trello_card_url?: string }>`

## Rules
- Include `operation_id` and `chat_id` in adapter result payload for auditing.
- Build deterministic Trello card title/description from order payload + `operation_id`.
- Include `operation_id` marker in Trello card description for downstream dedupe.
- In live mode (`dryRun=false`), require Trello auth/config (`apiKey`, `token`, `listId`).
- Apply controlled timeout and bounded retry policy.
- Retry only on transport transient failures and retriable upstream statuses (`429`, `5xx`).
- Do not retry deterministic `4xx` responses.

## Error Handling
- Timeout/network errors are retriable (bounded attempts).
- Mapping/validation errors are non-retriable.
- Missing live security config is non-retriable.
- Deterministic Trello `4xx` errors are non-retriable.

## Error Handling Classification
- Retriable: timeout/network/transient upstream availability failures, `429`, `5xx`.
- Non-retriable: invalid mapping/payload, `401/403` auth failure, `400/404/422` business/validation errors, missing credentials in live mode.

## Security Constraints
- Execute only after runtime confirmation gate.
- Do not log Trello key/token or sensitive headers/query strings.
- Restrict writes to configured Trello list/board scope only.
- Return sanitized error details (no secret leakage).

## Idempotency / Dedupe
- Propagate `operation_id` downstream as dedupe marker.
- Before create, search deterministic marker (`operation_id`) in target list/board when feasible.
- Repeated executions for same `operation_id` should return deterministic result (existing or newly-created card).

## Timeout and Retry Policy
- Bounded request timeout per Trello call.
- Bounded retries for transient failures only.
- No infinite retries.
- Default connector policy: `timeoutMs=30000`, `maxRetries=2` (hasta 3 intentos totales).

## Idempotency Strategy
- `operation_id` is the canonical idempotency key.
- Runtime/state must avoid duplicate confirmed operations; adapter dedupe acts as downstream safety net.

## External Error Mapping
- `timeout` / transport abort: retriable
- `network` unavailable/reset: retriable (bounded retries)
- `429` Trello throttle: retriable (bounded retries)
- `5xx` Trello upstream failure: retriable (bounded retries)
- `4xx` validation/auth/business errors: non-retriable
- missing live Trello config: non-retriable

## Dry-Run Behavior
- Supported and enabled by default.
- Dry-run returns structured result with no Trello side effects.
- Turning dry-run off is allowed only when Trello credentials and list scope are configured.

## Test Cases
- `returns_dry_run_by_default`
- `fails_when_live_without_trello_api_key`
- `fails_when_live_without_trello_token`
- `fails_when_live_without_trello_list_id`
- `maps_order_to_trello_card_payload`
- `includes_operation_marker_for_idempotency`
- `retries_on_retriable_trello_status`
- `does_not_retry_on_non_retriable_trello_4xx`
