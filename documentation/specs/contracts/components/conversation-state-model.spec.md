> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-state-model.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - conversation state model and transitions

Status: MVP
Last Updated: 2026-03-12

## Objective
Define the canonical conversation state model and the runtime state transitions for chat-driven operations.
It must describe state semantics only and must not execute business actions directly.

## Inputs
- inbound message context (`chat_id`, `text`)
- current `ConvoState` from `stateStore`
- validation/missing-field outcomes
- confirmation command outcomes (`confirmar` / `cancelar`)
- dedupe/idempotency registration outcomes

## Outputs
- updated `ConvoState` persisted by `stateStore`
- operation lifecycle status transitions persisted by `operationsStore`
- deterministic next runtime phase (`ask_missing`, `wait_confirm`, `completed`, `canceled`, `duplicate`, `idle`)

## Conversation State Model (Chat-Scoped)

`ConvoState`:
- `pending?`
  - `operation_id: string`
  - `idempotency_key?: string`
  - `action: { intent: "gasto" | "pedido" | "web" | "quote.order" | "order.lookup" | "order.update" | "order.cancel" | "payment.record"; payload: object }`
  - `missing?: string[]`
  - `asked?: string`

Derived phases:
- `idle`: no `pending` state for chat.
- `collecting_missing`: `pending` exists and at least one field is still missing (`asked` is set).
- `ready_to_confirm`: `pending` exists, normalized payload is complete, `missing=[]`, `asked` undefined.
- `awaiting_control`: equivalent behavior to `ready_to_confirm` (runtime expects `confirmar`/`cancelar`).
- terminal outcomes:
  - `completed` (operation status reaches `executed`, pending cleared)
  - `canceled` (operation status reaches `canceled`, pending cleared)
  - `duplicate` (existing operation detected, pending cleared)

## Operation Status Model (Persistence)

For confirmable operations, lifecycle states are:
- `pending_confirm`
- `confirmed`
- `canceled`
- `executed`

These statuses live in `operationsStore`; `ConvoState` tracks only active per-chat pending context.

## Transition Table (Runtime Semantics)

| Current Phase | Event | Guard/Condition | Next Phase | Persistence Effects |
|---|---|---|---|---|
| `idle` | new supported request | allowlist pass + parse/validate incomplete | `collecting_missing` | set pending state with `missing`/`asked` |
| `idle` | new supported request | allowlist pass + parse/validate complete + dedupe pass | `ready_to_confirm` | set pending + register `pending_confirm` |
| `idle` | new supported request | dedupe duplicate detected | `duplicate` -> `idle` | clear pending; return duplicate reference |
| `collecting_missing` | user provides value | validation still incomplete | `collecting_missing` | update payload, recompute `missing`, set next `asked` |
| `collecting_missing` | user provides value | validation complete + dedupe pass | `ready_to_confirm` | set normalized payload + idempotency key |
| `collecting_missing` | user sends `cancelar` | pending exists | `canceled` -> `idle` | upsert `canceled`, clear pending |
| `ready_to_confirm` | user sends `confirmar` | pending exists | `completed` -> `idle` | upsert `confirmed` then `executed`, clear pending |
| `ready_to_confirm` | user sends `cancelar` | pending exists | `canceled` -> `idle` | upsert `canceled`, clear pending |
| `ready_to_confirm` | user sends unrelated text | pending exists | `ready_to_confirm` | keep pending, ask to `confirmar`/`cancelar` |

## Rules
- Exactly one pending operation per `chat_id` at a time.
- No new operation should start while pending operation is unresolved.
- Runtime asks exactly one missing field per turn.
- `confirmar`/`cancelar` are only valid when pending state exists.
- `quote.order` may use intermediate pending states (e.g. guided customization and post-quote conversion confirmation) before entering `pedido` confirmable flow.
- Terminal outcomes (`executed`/`canceled`/`duplicate`) must clear pending state.

## Error Handling Classification
- Retriable: transient parse/runtime/tool connectivity failures; user can retry message flow.
- Non-retriable: allowlist reject, deterministic duplicate outcome, explicit cancellation.

## Security Constraints
- Allowlist gate must be evaluated before entering state transition flow.
- External side effects are forbidden before explicit confirmation transition.
- State must remain chat-scoped; no cross-chat state leakage.

## Idempotency / Dedupe
- `operation_id` identifies operation lifecycle.
- `idempotency_key` handles duplicate prevention for semantically equivalent requests.
- Dedupe check occurs before final confirmation summary/execution path.

## Test Cases
- `starts_pending_state_for_new_request`
- `stays_in_collecting_missing_until_complete`
- `transitions_to_ready_to_confirm_when_complete`
- `transitions_to_executed_on_confirm_and_clears_pending`
- `transitions_to_canceled_on_cancel_and_clears_pending`
- `resolves_duplicate_and_returns_to_idle`
