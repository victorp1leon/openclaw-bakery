# SQLite Migrations and Versioning Notes

Status: MVP
Last Updated: 2026-02-26

## Current strategy (implemented)

Migration logic runs automatically at startup (`src/state/database.ts`) and currently uses:
- `CREATE TABLE IF NOT EXISTS` for base tables
- `PRAGMA table_info` checks for additive columns
- conditional `ALTER TABLE ... ADD COLUMN` for missing columns
- post-migration normalization updates for `idempotency_key` and `updated_at`
- unique index creation for idempotency key (`idx_operations_idempotency`)

This is a practical MVP strategy and keeps bootstrap simple.

## Current limitations
- No dedicated `schema_migrations` table.
- No explicit migration version IDs.
- Limited rollback tooling (restore from backup is primary rollback path).

## Recommended next-step strategy

1. Introduce a `schema_migrations` table:
   - `version` (unique)
   - `applied_at`
2. Move migration logic into ordered migration units (`001_*.sql`, `002_*.sql`, etc.).
3. Run unapplied migrations transactionally at startup.
4. Keep migrations additive/backward-compatible when possible.
5. Pair risky migrations with mandatory pre-migration backup.

## Migration operational rules
- Never run untested schema changes directly on the primary DB.
- For non-additive changes, stage and validate data backfill before cutover.
- Keep app/runtime code compatible with both pre- and post-migration schema during rollout window.
- Log migration start/end with version identifiers.

## Rollback policy
- Primary rollback mechanism: restore previous DB backup.
- For versioned migrations, maintain explicit down-migration notes when feasible.

