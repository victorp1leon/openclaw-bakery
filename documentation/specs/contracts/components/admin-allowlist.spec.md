# Spec - admin-allowlist (Phase 6 admin operations)

Status: MVP
Last Updated: 2026-03-25

## Objective
Expose a controlled admin allowlist capability (`admin.allowlist`) to view and mutate authorized `chat_id` entries with strict safety guardrails.

## Inputs
- `chat_id: string` (requester context)
- `operation: "view" | "add" | "remove"`
- optional `target_chat_id?: string`

## Outputs
- `status: ok`
- `operation: "view" | "add" | "remove"`
- `changed: boolean`
- `target_chat_id?: string`
- `allowlist_size: number`
- `allowlist[]` (`chat_id` list, bounded)
- `persistent: false`
- `trace_ref`
- `detail`
- `generated_at`

## Business Rules
- `view` must be side-effect free.
- `add/remove` are confirmable operations at runtime level.
- `target_chat_id` is required for `add/remove`.
- `remove` must reject self-removal (`requester chat_id` == `target_chat_id`).
- `remove` must reject operations violating minimum allowlist size.
- Output must include deterministic `trace_ref` (`admin-allowlist:<id>`).

## Error Handling Classification
- Retriable: transient runtime failures around tool execution wrapper.
- Non-retriable: target missing, self-remove blocked, minimum-size violations.

## Security Constraints
- Never permit removing the currently authenticated requester.
- Never return raw stack traces in user-facing responses.
- Keep allowlist output bounded and operationally concise.

## Idempotency / Dedupe
- `view` is read-only and idempotent.
- `add/remove` are mutation operations controlled by runtime confirm flow and operation lifecycle tracking.

## Test Cases
- `view_returns_allowlist_snapshot`
- `add_mutates_allowlist_when_target_present`
- `remove_mutates_allowlist_when_target_present`
- `remove_rejects_self_target`
- `remove_rejects_below_min_size`
- `add_remove_require_target_chat_id`
