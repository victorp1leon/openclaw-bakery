> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/missing-field-picker.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source path is preserved as historical trace metadata; files were retired in Wave C.2.

# Spec - missingFieldPicker

Status: MVP
Last Updated: 2026-02-26

## Objective
Choose exactly one missing field to ask next, preserving a simple deterministic user experience.
It must only select the next missing field and must not infer/modify payload values.

## Inputs
- `missing: string[]`
- `alreadyAsked?: string`

## Outputs
- `string | undefined` (next field to ask)

## Rules
- Return `undefined` when no fields are missing.
- By default, return the first field in the missing list.
- If `alreadyAsked` is provided and still present, prefer the next field in sequence.
- If `alreadyAsked` is missing/not found, fall back to the first available field.
- Selection must be deterministic for a given input list.

## Error Handling Classification
- Retriable: not applicable (pure deterministic selection).
- Non-retriable: invalid/empty input maps to deterministic `undefined` or fallback selection.

## Security Constraints
- Must not expose hidden/internal fields that are not meant for user prompts.
- Must rely on validated missing-field list from guard layer.

## Idempotency / Dedupe
- Not applicable in this component (selection helper only).

## Test Cases
- `returns_undefined_when_missing_empty`
- `returns_first_missing_field_by_default`
- `returns_next_field_after_already_asked`
- `falls_back_to_first_when_already_asked_not_found`
