> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/confirmation-guard.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - confirmationGuard

Status: MVP
Last Updated: 2026-02-26

## Objective
Recognize conversation control commands (`confirmar`, `cancelar`) and block external execution until explicit confirmation.
It must only classify control intent and must not execute tools directly.

## Inputs
- user text message
- pending operation context presence/absence (from runtime/state)

## Outputs
- confirmation intent classification (`confirm` | `cancel` | `none`)
- decision signal for runtime flow control

## Rules
- Accept common Spanish variants (`confirmar`, `cancelar`).
- Do not interpret ambiguous text as confirmation.
- Resolve an operation only if a pending operation exists.

## Error Handling Classification
- Retriable: not applicable (deterministic text classification).
- Non-retriable: ambiguous/non-control text resolves to `none` and does not execute action.

## Security Constraints
- No external action may proceed without explicit positive confirmation signal.
- Ambiguous text must default to non-confirm behavior.

## Idempotency / Dedupe
- Confirmation guard itself is stateless; dedupe/idempotency are delegated to runtime/state stores.

## Test Cases
- `detects_confirm`
- `detects_cancel`
- `ignores_non_confirmation_text`
