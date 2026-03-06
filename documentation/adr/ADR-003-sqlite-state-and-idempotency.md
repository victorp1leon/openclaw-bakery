# ADR-003: Use SQLite for Conversation State and Operation Idempotency

Status: Accepted
Last Updated: 2026-02-26

## Context
The bot needs lightweight, local persistence for:
- per-chat pending conversation state,
- operation lifecycle records,
- idempotency/dedupe safeguards.

## Decision
Use SQLite as the persistence backend for state, operations, and idempotency data in MVP.

## Consequences
- Pros:
  - Zero external DB dependency for local/self-hosted operation.
  - Simple deployment/backup story.
  - Sufficient consistency guarantees for MVP workflows.
- Cons:
  - Concurrency/scale limits compared to server DBs.
  - Requires disciplined backup/restore and migration governance.

