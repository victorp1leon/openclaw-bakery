---
name: specs-wave-migration
description: Migrate Spec-Driven documentation waves from `documentation/specs/migration-manifest.md` into canonical feature packages (`spec/clarify/plan/tasks/analyze` + legacy snapshot), update manifest status (`pending` -> `migrated`), and rebuild `documentation/specs/_index.md` feature registry. Use for Wave A/B/C plan-entry migrations.
---

# specs-wave-migration

## When To Use
- You are executing migration waves for plan entries (`R-*`, `P-*`) in `documentation/specs/migration-manifest.md`.
- You need deterministic scaffolding across many features without hand-editing each folder.
- You need manifest and index updates to stay consistent.

## What It Does
1. Reads pending entries for a selected wave/domain from `documentation/specs/migration-manifest.md`.
2. Creates canonical package files per feature:
- `spec.md`
- `clarify.md`
- `plan.md`
- `tasks.md`
- `analyze.md`
- `history/legacy-plans/<legacy-plan>.md`
3. Updates matching manifest entries from `pending` to `migrated`.
4. Rebuilds `documentation/specs/_index.md` Feature Registry from migrated entries.

## Run
```bash
bash .codex/skills/specs-wave-migration/scripts/migrate-wave.sh --wave A --domain all
```

## Options
- `--wave <value>` (required): `A`, `B`, `C`, `C.1`.
- `--domain <value>` (optional): `runtime`, `platform`, `all` (default: `all`).
- `--status <value>` (optional): source status to migrate from (default: `pending`).

## Validation
```bash
rg -n "^\\| (R|P)-[0-9]{3} .*\\| A \\| pending \\|" documentation/specs/migration-manifest.md
rg -n "^\\| (R|P)-[0-9]{3} .*\\| A \\| migrated \\|" documentation/specs/migration-manifest.md
rg -n "Feature Registry|migrated" documentation/specs/_index.md
```

## Guardrails
- Intended for plan entries (`R-*`, `P-*`), not C4 contract copy waves.
- Documentation-only workflow; do not mutate runtime/product code.
- Keep sessions under `documentation/ai_collaboration/plans/*/sessions`.
