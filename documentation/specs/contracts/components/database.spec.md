> Migration Trace: Canonical copy generated from `documentation/c4/ComponentSpecs/StateAndPersistence/Specs/database.spec.md` on 2026-03-23 (Wave C.1).
> Legacy C4 source remains as temporary reference during migration.

# Spec - database initialization (SQLite)

Status: MVP
Last Updated: 2026-02-26

## Objective
Create/open the SQLite database and ensure the minimum bot schema exists.
It must manage schema/readiness only and must not apply business conversation logic.

## Inputs
- database path/config
- schema initialization/migration commands

## Outputs
- opened SQLite connection/handle
- ensured base schema/index availability

## Rules
- Create required tables if they do not exist.
- Create indexes for `chat_id` and `operation_id` lookups.
- Maintain compatibility with simple v1 migrations.

## Error Handling Classification
- Retriable: temporary file lock/contention or transient filesystem issues.
- Non-retriable: invalid path/permissions, unrecoverable schema corruption.

## Security Constraints
- DB initialization must not leak secrets in logs.
- File permissions should follow least-privilege local runtime policy.

## Idempotency / Dedupe
- Schema initialization should be safe to execute repeatedly (`IF NOT EXISTS` behavior).

## Test Cases
- `creates_schema_on_empty_db`
- `reopens_existing_db_without_error`
