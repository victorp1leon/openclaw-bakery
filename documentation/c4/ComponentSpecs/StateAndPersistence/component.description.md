# Component Description - State & Persistence

Status: MVP
Last Updated: 2026-02-26

## Responsibility
Persist conversation state, operations, and idempotency data so the bot remains safe and traceable.

## Components
- `database.ts`: SQLite initialization / schema setup
- `stateStore.ts`: per-`chat_id` conversation state
- `operations.ts`: operations and results
- `idempotency.ts`: idempotency keys and dedupe persistence

## Design Rules
- Every confirmable operation must have an `operation_id`.
- Persistence must support safe retries.
- Conversation state must support missing fields and pending confirmation state.
