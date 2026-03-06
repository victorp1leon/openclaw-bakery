# Spec - validationGuard

Status: MVP
Last Updated: 2026-02-26

## Objective
Validate drafts with Zod, apply normalization/defaults, and report missing fields for continued conversation.
It must validate/normalize payload shape and must not execute tools or mutate external systems.

## Inputs
- draft payload candidate
- target Zod schema (`draft` or `final` readiness path)

## Outputs
- validation outcome (`ok` with normalized data, or missing/invalid details)
- deterministic missing-field list for prompt flow

## Rules
- Distinguish draft schema (partial) vs final schema (ready to confirm).
- Apply safe defaults (e.g., `moneda=MXN` where appropriate).
- Return a deterministic missing-field list for `missingFieldPicker`.

## Error Handling Classification
- Retriable: not applicable for deterministic schema validation.
- Non-retriable: invalid enum/type/shape errors require user correction or parser reformulation.

## Security Constraints
- Reject fields/values outside schema constraints.
- Validation outcome must not leak secrets or internal stack traces.

## Idempotency / Dedupe
- Not handled in validation guard; delegated to runtime/state layers after validation.

## Test Cases
- `accepts_valid_expense_draft`
- `returns_missing_required_fields`
- `rejects_invalid_enum_values`
