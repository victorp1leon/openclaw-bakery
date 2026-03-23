---
name: specs-wave-migration
description: Migrate Spec-Driven documentation waves from `documentation/specs/migration-manifest.md` into canonical specs artifacts (feature packages for `R-*`/`P-*`, contract copies for `C4-*`), update manifest status (`pending` -> `migrated`), and rebuild `documentation/specs/_index.md` feature registry. Use for Wave A/B/C plan entries and Wave C.1 contract migration.
---

# specs-wave-migration

## When To Use
- You are executing migration waves for plan entries (`R-*`, `P-*`) or C4 contract entries (`C4-*`) in `documentation/specs/migration-manifest.md`.
- You need deterministic scaffolding across many features without hand-editing each folder.
- You need manifest and index updates to stay consistent.

## What It Does
1. Reads pending entries for a selected wave/domain from `documentation/specs/migration-manifest.md`.
2. For plan entries (`R-*`, `P-*`), creates canonical package files per feature:
- `spec.md`
- `clarify.md`
- `plan.md`
- `tasks.md`
- `analyze.md`
- `history/legacy-plans/<legacy-plan>.md`
3. For contract entries (`C4-*`, Wave `C.1`), copies source spec into canonical destination with source trace header.
4. Updates matching manifest entries from `pending` to `migrated`.
5. Rebuilds `documentation/specs/_index.md` Feature Registry from migrated plan entries.

## Run
```bash
bash .codex/skills/specs-wave-migration/scripts/migrate-wave.sh --wave A --domain all
```

## Options
- `--wave <value>` (required): `A`, `B`, `C`, `C.1`.
- `--domain <value>` (optional): `runtime`, `platform`, `contracts`, `all` (default: `all`).
- `--status <value>` (optional): source status to migrate from (default: `pending`).

## Validation
```bash
rg -n "^\\| (R|P)-[0-9]{3} .*\\| A \\| pending \\|" documentation/specs/migration-manifest.md
rg -n "^\\| (R|P)-[0-9]{3} .*\\| A \\| migrated \\|" documentation/specs/migration-manifest.md
rg -n "^\\| C4-[0-9]{3} .*\\| C.1 \\| (pending|migrated) \\|" documentation/specs/migration-manifest.md
rg -n "Feature Registry|migrated" documentation/specs/_index.md
```

## Guardrails
- Supports both feature waves (`R-*`, `P-*`) and contract wave (`C4-*`, `C.1`) from the manifest.
- Documentation-only workflow; do not mutate runtime/product code.
- Keep sessions under `documentation/ai_collaboration/plans/*/sessions`.
