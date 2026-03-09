# Spec - conversationProcessor

Status: MVP
Last Updated: 2026-03-09

## Objective
Orchestrate the conversation flow for each message and produce a safe, consistent response.
It must coordinate flow/persistence and must not trust raw model output without guards.

## Inputs
- `chat_id: string`
- `text: string`
- dependencies: logger, state store, parser/intent router, tool executor, config

## Outputs
- text response for the channel
- persisted state/operation changes
- structured trace events

## Persistence Integration Expectations (`stateStore` / `operationsStore`)
- Load chat conversation state at message start (`getState(chat_id)`).
- Persist pending action context when a confirmable operation is being built (`setState`).
- Clear pending context after explicit cancel or after terminal execution path (`clearPending`).
- Register operation lifecycle transitions in persistence:
  - `pending_confirm` when operation is ready for confirmation
  - `confirmed` when user confirms
  - `canceled` when user cancels
  - `executed` when tool execution (or simulated execution) completes
  - `failed` when confirmed execution fails in a controlled way
- Ensure idempotency/dedupe registration occurs before confirmation summary is shown.
- Persist `operation_id` and `idempotency_key` consistently across state and operation records.

## Business Rules
- Reject messages from non-allowed `chat_id` values with a standard response.
- Apply per-chat rate limiting before intent parsing/state progression.
- If there is a pending operation and the user replies `confirmar|cancelar`, resolve it.
- If required fields are missing, ask for exactly one missing field per turn.
- Before executing an external tool, show a summary and require confirmation.
- Register `operation_id` and prevent duplicates with idempotency/dedupe guards.
- For `gasto`, execute `append-expense` adapter on confirm path.
- For `pedido`, execute `create-card` + `append-order` adapters on confirm path.
- For order reporting queries (e.g. `pedidos hoy`, `pedidos del 28 de abril`, `pedidos esta semana`, `pedidos del mes de mayo`, `pedidos de este año`), route deterministically to `report-orders` without entering confirm flow.
- For order lookup queries (e.g. `consulta pedido de ana`, `buscar pedido op-123`), route deterministically to `lookup-order` without entering confirm flow.
- For `web`, execute `publish-site` adapter on confirm path.
- `web` conversational flow may be feature-gated; when disabled, runtime must return a controlled message and suggest content-driven terminal/CI publish path.

## Error Handling and Expected Behavior
- Transient OpenClaw failure: safe fallback (when softfail is enabled).
- Invalid model JSON: attempt extraction/fallback; if impossible, ask for reformulation.
- Tool error: return a controlled failure response and keep traceability (`status=failed`).

## Error Handling Classification
- Retriable: transient OpenClaw/runtime transport failures and connector timeouts (under configured policy).
- Non-retriable: authorization rejects, irrecoverable validation failures, explicit cancel flow.

## Security Constraints
- Enforce allowlist before deep processing.
- Enforce rate limiting before intent parsing and external execution paths.
- Enforce explicit confirmation before any external tool execution.
- Preserve redaction-safe traces (no credentials/secrets in user/log outputs).

## Idempotency / Dedupe
- Must generate/persist `operation_id` for confirmable operations.
- Must run dedupe/idempotency checks before confirmation summary and before execution.
- Repeated messages for same operation should produce deterministic duplicate behavior.

## User-Visible Error Messaging Policy
- Error responses must be safe, concise, and actionable.
- Never expose secrets, tokens, stack traces, provider credentials, or raw stderr in user-facing text.
- Use normalized user-facing categories:
  - authorization: standard deny message
  - parse/understanding: ask for reformulation
  - validation/missing data: ask one specific missing field
  - duplicate: return deterministic duplicate reference (`operation_id`/status)
  - execution failure: controlled failure message with traceable operation reference
- Keep response language consistent with conversation language (Spanish in current runtime).
- Internal diagnostic detail belongs in traces/logs with redaction, not in chat responses.

## Test Cases (Minimum)
- `rejects_unauthorized_chat_id`
- `asks_one_missing_field_only`
- `shows_summary_and_waits_confirmation`
- `executes_expense_tool_on_confirm`
- `persists_failed_status_on_expense_tool_error`
- `cancels_pending_operation`
- `returns_orders_report_for_supported_period_queries`
- `returns_order_lookup_for_supported_queries`
- `emits_allowlist_reject_trace`
- `rejects_message_when_rate_limited`
