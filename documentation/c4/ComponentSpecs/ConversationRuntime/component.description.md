# Component Description - Conversation Runtime (C4 Component Level)

Status: MVP
Last Updated: 2026-03-03

## Responsibility
Coordinate the end-to-end conversation flow and apply security/UX rules:
- allowlist
- per-chat rate limiting / burst protection
- confirm/cancel
- one missing field per turn
- action summary
- tool execution (when applicable)

## Internal Components
- `conversationProcessor`
- `intentRouter`
- `parser`
- `rateLimitGuard`
- `validationGuard`
- `missingFieldPicker`
- `confirmationGuard`
- `dedupeGuard`

## Component Relationships
1. `conversationProcessor` receives a message from the channel adapter.
2. It evaluates allowlist, rate limit guard, and conversation state.
3. It uses `intentRouter` and `parser` to build a draft.
4. It applies validation/missing-field/confirmation guards.
5. It persists state in SQLite and returns a response to the channel.

## Key Decisions
- The runtime does not trust LLM output blindly.
- Parsers may return partial payloads; the runtime completes via prompts.
- `confirmar/cancelar` is treated as a universal interaction protocol, not a standalone skill.
