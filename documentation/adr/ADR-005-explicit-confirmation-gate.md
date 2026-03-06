# ADR-005: Enforce Explicit `confirmar/cancelar` Gate Before External Actions

Status: Accepted
Last Updated: 2026-02-26

## Context
Model output is untrusted and external integrations (Sheets/Trello/publish) can create irreversible side effects.

## Decision
Require a two-phase flow for confirmable operations:
1. Build and show summary with pending operation state.
2. Execute tools only after explicit `confirmar`; allow abort via `cancelar`.

## Consequences
- Pros:
  - Strong safety barrier against accidental/misinterpreted execution.
  - Improves auditability and user trust.
  - Aligns with idempotency/dedupe lifecycle semantics.
- Cons:
  - Adds one extra conversational step before action.
  - Requires clear user messaging and pending-state handling.

