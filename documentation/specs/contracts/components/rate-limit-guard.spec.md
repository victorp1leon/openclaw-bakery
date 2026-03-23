> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/rate-limit-guard.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - rateLimitGuard

Status: MVP
Last Updated: 2026-03-03

## Objective
Apply per-chat rate limiting with burst protection before deep runtime processing.
It must enforce message throughput bounds and must not perform intent parsing or external side effects.

## Inputs
- `chat_id: string`
- policy config:
  - `enabled: boolean`
  - `windowMs: number`
  - `maxMessagesPerWindow: number`
  - `blockDurationMs: number`
- optional clock dependency (`nowMs`) for deterministic tests

## Outputs
- decision object:
  - `ok: true` when message may proceed
  - `ok: false` with:
    - `reason: "window_limit" | "blocked"`
    - `retryAfterSeconds: number`

## Rules
- Enforce a sliding window per `chat_id`.
- If messages in current window exceed `maxMessagesPerWindow`, set a temporary block for that chat.
- While blocked, every message returns `blocked` with deterministic retry time.
- `retryAfterSeconds` must be at least `1`.
- When `enabled=false`, guard should always return `ok`.

## Error Handling Classification
- Retriable: temporary throttle (`window_limit` / `blocked`).
- Non-retriable: not applicable (deterministic in-memory guard behavior).

## Security Constraints
- Guard must run before intent parsing and tool execution.
- Error text should not reveal secrets or internal implementation details.
- Guard should not write sensitive payload data to logs/traces.

## Idempotency / Dedupe
- Independent from idempotency guard; rate limit must not mutate operation lifecycle state.

## Test Cases
- `allows_messages_within_window`
- `blocks_when_window_exceeded`
- `keeps_chat_blocked_until_duration_expires`
- `isolates_limits_per_chat_id`
- `bypasses_when_disabled`
