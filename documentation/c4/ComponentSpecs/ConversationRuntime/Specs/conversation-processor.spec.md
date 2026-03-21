# Spec - conversationProcessor

Status: MVP
Last Updated: 2026-03-19

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
- When the pending missing field is numeric (`monto`, `cantidad`, `total`), apply numeric heuristic extraction from free text (e.g. `son 380 pesos`); if extraction fails, ask again for the same field.
- Before executing an external tool, show a summary and require confirmation.
- Register `operation_id` and prevent duplicates with idempotency/dedupe guards.
- For `gasto`, execute `append-expense` adapter on confirm path.
- For `pedido`, execute `create-card` + `append-order` on confirm path and rollback Trello card creation if Sheets append fails.
- For `pedido`, if rollback fails after partial execution, keep user-facing response controlled/generic and log internal failure detail for support.
- For `pedido`, `fecha_hora_entrega` must be canonicalized before summary/confirmation as `YYYY-MM-DDTHH:mm:ss` in `America/Mexico_City` (no free-text allowed in final payload).
- Runtime must accept natural delivery expressions (`hoy`, `mañana`, `pasado mañana`, `para el viernes`, `este/proximo viernes`) only if they can be converted to canonical datetime.
- If delivery date is present without explicit time, runtime must request hour clarification before showing summary.
- For order reporting queries (e.g. `pedidos hoy`, `pedidos del 28 de abril`, `pedidos esta semana`, `pedidos del mes de mayo`, `pedidos de este año`), route deterministically to `report-orders` without entering confirm flow.
- When `OPENCLAW_READONLY_ROUTING_ENABLE=1`, evaluate read-only OpenClaw routing before deterministic read-only detectors (`report/orders`, `lookup`, `status`, `schedule`, `shopping`, `quote`).
- If read-only OpenClaw routing is active and strict mode is enabled (`OPENCLAW_STRICT=1`), do not use deterministic read-only fallback when OpenClaw returns `unknown`/invalid payload; return controlled clarification instead.
- If read-only OpenClaw routing is active and strict mode is disabled (`OPENCLAW_STRICT=0`), deterministic read-only fallback remains allowed when OpenClaw returns `unknown`.
- `OPENCLAW_READONLY_QUOTE_ENABLE=0` disables OpenClaw read-only routing for `quote.order` only; quote flow remains available through deterministic routing.
- If user asks report intent without period (e.g. `reporte de pedidos`), runtime must ask for clarification (`hoy|semana|mes|año`) and continue once resolved.
- `report.orders` replies must include `Ref` (`trace_ref`) in success/no-match, and controlled failure with `Ref` when provider fails.
- For order lookup queries (e.g. `consulta pedido de ana`, `buscar pedido op-123`), route deterministically to `lookup-order` without entering confirm flow.
- `order.lookup` replies must include `Ref` (`trace_ref`) in both success and no-match responses.
- If `order.lookup` fails at execution time, runtime must return a controlled message with support reference (`Ref: order-lookup:<operation_id>`).
- For order status queries (e.g. `estado del pedido op-123`), route deterministically to `order-status` without entering confirm flow.
- If user asks status intent without reference (e.g. `estado del pedido`), runtime must ask for clarification (`folio|operation_id|cliente|producto`) and continue once resolved.
- `order.status` replies must include `Ref` (`trace_ref`) in success/no-match, and controlled failure with `Ref` when provider fails.
- For shopping list queries (e.g. `lista de insumos para hoy`, `insumos del pedido op-123`), route deterministically to `shopping-list-generate` without entering confirm flow.
- `shopping.list.generate` response should surface `intervencion manual requerida` when items are excluded (e.g. cantidad invalida o producto sin receta mapeada).
- `shopping.list.generate` should prioritize nearest deliveries first and keep top 10 orders by default.
- For day schedule queries (e.g. `agenda de hoy`, `agenda del 2026-03-20`), route deterministically to `schedule-day-view` without entering confirm flow.
- When `schedule.day_view` excludes rows due to critical data quality issues (e.g. missing ISO datetime), runtime must still return a partial agenda plus visible `inconsistencias`.
- For `quote.order`, after returning the quote, require an explicit user decision (`confirmar/cancelar`) to convert quote into `pedido` draft.
- For `quote.order` with `envio_domicilio`, if zone is missing/ambiguous runtime must ask for `zona` before closing quote total.
- For `quote.order`, if options/extras matching is ambiguous, runtime must ask explicit clarification (or allow `sin extras`) before continuing.
- Before converting accepted quote to `pedido`, runtime must recalculate quote from latest catalog and compare snapshot (`total` + lines); if changed, show updated quote and require reconfirmation.
- If quote is accepted for conversion, runtime must continue with regular `pedido` flow (ask missing fields, show summary, require final confirmation before executing `order.create` connectors).
- Orders created from quote conversion must include lightweight traceability `quote_id` in `notas` (`Creado desde cotizacion (quote_id: ...)`).
- For `order.update`, detect update intent deterministically and require explicit `confirmar/cancelar` before tool execution; apply Trello+Sheets with rollback on partial failure.
- If `order.update.patch.fecha_hora_entrega` is provided, it must be canonicalized to `YYYY-MM-DDTHH:mm:ss` (`America/Mexico_City`) before summary/execution; if conversion fails or time is missing, runtime must keep pending state and ask for patch clarification.
- If `order.update` request has no explicit reference, runtime should attempt lookup-by-query from free text; continue automatically only on unique match, otherwise ask for precise `folio|operation_id` and show up to 5 options when ambiguous.
- If `order.update` request has no patch/cambios validos, runtime must ask for missing update fields (no hard parse fail), keep pending operation, and continue with the same `operation_id` once the user provides patch details.
- For `order.cancel`, detect cancel intent deterministically, show summary, and require explicit `confirmar/cancelar` before tool execution; apply Trello+Sheets with rollback on partial failure.
- If `order.cancel` request has no explicit reference, runtime should attempt lookup-by-customer query; continue automatically only on unique match, otherwise ask for precise `folio|operation_id`.
- If `order.cancel` returns `already_canceled=true`, runtime must reply with deterministic no-op message (`Este pedido ya fue cancelado con folio <folio>`).
- If `order.cancel` fails during execution, runtime must return controlled failure with support reference (`Ref: order-cancel:<operation_id>`), while internal traces keep failure detail.
- For `payment.record`, detect payment intent deterministically, show summary, and require explicit `confirmar/cancelar` before tool execution; persist payment movement in Sheets with audit trail in `notas`.
- If `payment.record` request has no explicit reference, runtime should attempt lookup-by-query from free text; continue automatically only on unique match, otherwise ask for precise `folio|operation_id` and show up to 5 options when ambiguous.
- If `payment.record` execution returns `already_recorded=true`, runtime must reply with deterministic no-op message (`Pago ya registrado para <folio>. operation_id: <operation_id>`).
- For `inventory.consume`, detect inventory consume intent deterministically, show summary, and require explicit `confirmar/cancelar` before tool execution; decrement `Inventario` and append `MovimientosInventario` entries with idempotency guarantees.
- `inventory.consume` must be feature-gated via `INVENTORY_CONSUME_ENABLE` (default `0`); when disabled, runtime must return a controlled message without executing the tool.
- In MVP, `inventory.consume` is explicit-command only (no automatic trigger from `order.create` confirmation path).
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
  - duplicate:
    - `order.create`: `Este pedido ya existe con folio <folio>`
    - `order.cancel` no-op duplicate: `Este pedido ya fue cancelado con folio <folio>`
    - `inventory.consume`: `Consumo ya aplicado para <folio>. operation_id: <operation_id>`
    - other confirmable intents: deterministic duplicate reference (`operation_id`/status)
  - execution failure: controlled failure message with traceable operation reference
  - `schedule.day_view` failure: controlled message with `trace_ref` for support lookup
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
- `returns_order_status_for_supported_queries`
- `returns_shopping_list_for_supported_queries`
- `returns_schedule_day_view_for_supported_queries`
- `supports_order_update_summary_and_confirm_flow`
- `supports_order_update_lookup_resolution_when_reference_missing`
- `supports_order_update_ambiguous_reference_prompt_with_options`
- `supports_order_update_missing_patch_clarification_flow`
- `supports_order_cancel_summary_and_confirm_flow`
- `supports_payment_record_summary_and_confirm_flow`
- `supports_payment_record_lookup_resolution_when_reference_missing`
- `supports_payment_record_ambiguous_reference_prompt_with_options`
- `supports_payment_record_noop_message_when_already_recorded`
- `supports_inventory_consume_summary_and_confirm_flow`
- `blocks_inventory_consume_when_feature_flag_disabled`
- `does_not_auto_trigger_inventory_consume_from_order_create`
- `supports_quote_to_order_conversion_flow`
- `routes_readonly_intents_via_openclaw_when_feature_flag_enabled`
- `does_not_fallback_readonly_in_strict_mode_when_openclaw_returns_unknown`
- `falls_back_to_deterministic_readonly_in_non_strict_mode_when_openclaw_returns_unknown`
- `emits_allowlist_reject_trace`
- `rejects_message_when_rate_limited`
