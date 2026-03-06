# Spec - idempotency/dedupe persistence

Status: MVP
Last Updated: 2026-02-26

## Objective
Prevent repeated executions caused by user or channel retries.
It must provide idempotency/dedupe primitives and must not execute business actions itself.

## Inputs
- operation identity inputs (`operation_id`, chat/intent/payload/time window context)

## Outputs
- idempotency key material
- duplicate/non-duplicate lookup decisions

## Rules
- Store `operation_id` and result.
- Distinguish conversational dedupe (short window) from technical idempotency (`operation_id`).
- Allow lookup of already-processed operations.

## Error Handling Classification
- Retriable: transient storage lookup/write failures.
- Non-retriable: deterministic duplicate detection for same key/operation identity.

## Security Constraints
- Idempotency records should avoid exposing sensitive payload detail in logs.
- Key generation must be deterministic and collision-resistant for expected workload.

## Idempotency / Dedupe
- Core responsibility of this component.

## Test Cases
- `stores_operation_result_once`
- `returns_existing_result_for_same_operation_id`
