> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/StateAndPersistence/Specs/state-store.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - stateStore

Status: MVP
Last Updated: 2026-02-26

## Objective
Persist and retrieve conversation context by `chat_id`.
It must manage chat-scoped state only and must not execute tool/business side effects.

## Inputs
- `chat_id`
- state payload (`pending`, missing fields, asked marker, intent/action context)

## Outputs
- loaded state for `chat_id`
- persisted/cleared state acknowledgment (implementation-dependent)

## Rules
- Store current intent, partial draft, and confirmation state.
- Allow clearing state after cancel or completion.
- Provide a simple, deterministic API.
- Follow the canonical model defined in `ConversationRuntime/Specs/conversation-state-model.spec.md`.

## Error Handling Classification
- Retriable: transient storage access/locking failures.
- Non-retriable: invalid state shape should be rejected or normalized by caller contract.

## Security Constraints
- State records must be scoped by `chat_id` and not leak across chats.
- Stored state must not include raw secrets/tokens.

## Idempotency / Dedupe
- State transitions should be deterministic for repeated identical inputs.
- Global idempotency enforcement remains in operations/idempotency stores.

## Test Cases
- `saves_and_loads_chat_state`
- `clears_chat_state`
