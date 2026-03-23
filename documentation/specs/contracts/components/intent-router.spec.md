> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/intent-router.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - intentRouter

Status: MVP
Last Updated: 2026-02-26

## Objective
Classify free-form text into high-level action intents (`gasto`, `pedido`, `web`, `ayuda`, `unknown`).
Read-only operational intents are handled by a dedicated read-only router layer.
This component must classify intent only and must not execute tools or mutate state.

## Inputs
- `text: string`
- OpenClaw runtime availability/config flags
- optional fallback classifier inputs

## Outputs
- routed intent (`gasto` | `pedido` | `web` | `ayuda` | `unknown`)
- metadata (`intent_source`, fallback reason/error detail when applicable)

## Rules
- Prefer OpenClaw when it is enabled.
- Require valid JSON output from OpenClaw runtime.
- On transient errors (timeout/aborted/rate-limit), use local fallback if softfail is enabled.
- Emit traces with `intent_source` and fallback reason.
- Keep deterministic local priority for command-like `ayuda/help`.

## Error Handling Classification
- Retriable: transient OpenClaw invocation failures.
- Non-retriable: persistently unparseable classification output resolves to `unknown`.

## Security Constraints
- Do not leak prompts/secrets in trace metadata.
- Intent classification must not bypass allowlist/confirmation policies.

## Idempotency / Dedupe
- Not applicable in this component (classification only).

## Test Cases
- `routes_expense_from_spanish_input`
- `falls_back_on_transient_openclaw_error`
- `returns_unknown_on_unparseable_input`
