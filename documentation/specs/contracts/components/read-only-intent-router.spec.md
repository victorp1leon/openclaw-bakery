> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/read-only-intent-router.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - readOnlyIntentRouter

Status: MVP
Last Updated: 2026-03-24

## Objective
Route read-only intents using OpenClaw-first classification/extraction for:
`admin.health`, `admin.config.view`, `report.orders`, `order.lookup`, `order.status`, `schedule.day_view`, `shopping.list.generate`, `quote.order`.
It must classify and extract draft query/scope data only and must not execute tools or mutate state.

## Inputs
- `text: string`
- OpenClaw runtime response payload
- runtime mode flags:
  - `OPENCLAW_READONLY_ROUTING_ENABLE`
  - `OPENCLAW_READONLY_QUOTE_ENABLE`
  - `OPENCLAW_STRICT`

## Outputs
- routed read-only intent (or `unknown`)
- extracted draft fields (`period`, `query`, `day`, `scope`) when available
- routing metadata (`intent_source`, `openclaw_error` when applicable)

## Rules
- If `OPENCLAW_READONLY_ROUTING_ENABLE=0`, caller keeps deterministic routing path (component not used as primary).
- If `OPENCLAW_READONLY_ROUTING_ENABLE=1`, this router is evaluated before deterministic read-only detectors.
- If `OPENCLAW_READONLY_QUOTE_ENABLE=0`, `quote.order` must not be routed from this component.
- In strict mode (`OPENCLAW_STRICT=1`), unknown/invalid OpenClaw output must not trigger deterministic read-only fallback.
- In non-strict mode (`OPENCLAW_STRICT=0`), caller may fallback to deterministic read-only detectors when this component returns `unknown`.

## Error Handling Classification
- Retriable: transient OpenClaw runtime failures (timeout/abort/rate-limit/network).
- Non-retriable: invalid schema/non-JSON payload after extraction attempts.

## Security Constraints
- Never execute business actions from this component.
- Keep output advisory and untrusted until runtime validation and guard flow.
- Do not leak prompt internals/secrets in user-visible errors.

## Idempotency / Dedupe
- Not applicable in this component (routing/extraction only).

## Test Cases
- `routes_admin_health_without_extra_fields`
- `routes_admin_config_view_without_extra_fields`
- `routes_order_lookup_and_extracts_query`
- `routes_report_orders_with_period`
- `returns_unknown_when_quote_routing_disabled`
- `returns_unknown_on_non_json_openclaw_payload`
- `keeps_unknown_in_strict_mode_without_fallback`
