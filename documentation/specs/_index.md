# Specs Index (Canonical SDD)

Status: In Progress
Last Updated: 2026-03-23

## Purpose
Canonical registry for feature specs under `documentation/specs`.
This index tracks migrated and new SDD-native features by domain.

## Canonical Structure
- `documentation/specs/_index.md`
- `documentation/specs/_feature-template.md`
- `documentation/specs/migration-manifest.md` (created in Step 2 of the master plan)
- `documentation/specs/runtime/<feature-slug>/`
- `documentation/specs/platform/<feature-slug>/`
- `documentation/specs/contracts/components/<component-slug>.spec.md`

## Feature Registry
| Domain | Feature Slug | Status | Canonical Path | Legacy Sources | Notes |
|---|---|---|---|---|---|
| _pending_ | _pending_ | pending | _pending_ | _pending_ | Registry starts in migration waves (A-D). |

## Slug And Metadata Rules
1. Build `feature-slug` from legacy name by removing `phase*` prefixes and `-vN` suffixes.
2. Keep functional naming (for example `order-cancel-grill-hardening`).
3. Keep one canonical `plan.md` per feature; move extra legacy plans to `history/legacy-plans/`.
4. Minimum feature metadata must include:
- `domain`
- `feature-slug`
- `status`
- `created`
- `last-updated`
- `legacy-sources` (if migrated from old plans)

## Quick Start For A New Feature
1. Copy `documentation/specs/_feature-template.md`.
2. Create `documentation/specs/<domain>/<feature-slug>/`.
3. Add at minimum: `spec.md`, `clarify.md`, `plan.md`, `tasks.md`, `analyze.md`.
4. Register the feature in this index.
5. Keep sessions in `documentation/ai_collaboration/plans/*/sessions/` and link them from the feature folder when needed.

## Local Speckit Commands
- Definitions live in `.codex/commands/`.
- Available commands: `speckit.index`, `speckit.template`, `speckit.manifest`, `speckit.validate`.
