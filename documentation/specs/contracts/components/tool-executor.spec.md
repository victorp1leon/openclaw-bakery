> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/tool-executor.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - toolExecutor (or equivalent orchestration block)

Status: MVP
Last Updated: 2026-02-26

## Objective
Execute the correct tool adapter only after a confirmed pending operation, and persist a traceable result.
It must execute only authorized confirmed operations and must not bypass confirmation/allowlist guards.

## Scope Note
In the current MVP runtime, this behavior is mostly inlined inside `conversationProcessor` (simulated execution). This spec defines the target contract for a dedicated `toolExecutor` block or equivalent orchestration logic.

## Inputs
- confirmed pending operation (`operation_id`, `intent`, validated payload, `chat_id`)
- tool adapter dependencies
- persistence dependencies (`operations`, idempotency lookup/result persistence)

## Outputs
- structured execution result (`ok`, `operation_id`, `detail`, optional external metadata)
- updated operation status (`executed` | `failed`)
- user-facing response message(s)

## Rules
- Must not run unless confirmation has been explicitly detected.
- Dispatch by intent/action to the correct tool adapter.
- Preserve `operation_id` across tool calls and persistence.
- Persist result/status changes even on controlled failures.
- Return controlled failures without exposing secrets/internal stack traces.

## Error Handling Classification
- Retriable: transient connector failures (network timeout/rate limit) under configured retry policy.
- Non-retriable: validation/mapping failures, authorization violations, and deterministic 4xx business errors.

## Security Constraints
- Never execute without explicit confirmed pending operation context.
- Redact secrets/tokens from logs and user-facing error details.
- Enforce least-privilege adapter invocation per action.

## Idempotency / Dedupe
- Must use `operation_id`/idempotency records to prevent duplicate external side effects.
- Repeated execution attempts for same operation should resolve deterministically.

## Test Cases
- `does_not_execute_without_confirmation`
- `dispatches_expense_to_append_expense_tool`
- `persists_executed_status_on_success`
- `persists_failed_status_on_tool_error`
- `returns_controlled_error_message_on_failure`
