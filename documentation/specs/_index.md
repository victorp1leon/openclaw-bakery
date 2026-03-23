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
| runtime | openclaw-readonly-routing-expansion | migrated | documentation/specs/runtime/openclaw-readonly-routing-expansion/ | documentation/ai_collaboration/plans/runtime/implementation/openclaw-readonly-routing-expansion-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | expense-order-grill-hardening | migrated | documentation/specs/runtime/expense-order-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase2-3-expense-order-grill-hardening-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | order-cancel-grill-hardening | migrated | documentation/specs/runtime/order-cancel-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-cancel-grill-hardening-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | order-delivery-datetime-canonical-mx | migrated | documentation/specs/runtime/order-delivery-datetime-canonical-mx/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-canonical-mx-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | order-lookup-grill-hardening | migrated | documentation/specs/runtime/order-lookup-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lookup-grill-hardening-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | order-report-grill-hardening | migrated | documentation/specs/runtime/order-report-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-report-grill-hardening-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | order-status-grill-hardening | migrated | documentation/specs/runtime/order-status-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-status-grill-hardening-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | order-update-grill-closure | migrated | documentation/specs/runtime/order-update-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-update-grill-closure-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | payment-record-grill-closure | migrated | documentation/specs/runtime/payment-record-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-payment-record-grill-closure-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | quote-order-grill-closure | migrated | documentation/specs/runtime/quote-order-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-grill-closure-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | quote-readonly-cancel-guard | migrated | documentation/specs/runtime/quote-readonly-cancel-guard/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-readonly-cancel-guard-v1.md | Wave A migrated from legacy implementation plan. |
| runtime | schedule-day-view-grill-closure | migrated | documentation/specs/runtime/schedule-day-view-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-grill-closure-v2.md | Wave A migrated from legacy implementation plan. |
| runtime | shopping-list-operational-hardening | migrated | documentation/specs/runtime/shopping-list-operational-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-operational-hardening-v2.md | Wave A migrated from legacy implementation plan. |
| platform | codex-skill-registry-sync-automation | migrated | documentation/specs/platform/codex-skill-registry-sync-automation/ | documentation/ai_collaboration/plans/platform/implementation/codex-skill-registry-sync-automation.md | Wave A migrated from legacy implementation plan. |
| platform | documentation-hub-hygiene | migrated | documentation/specs/platform/documentation-hub-hygiene/ | documentation/ai_collaboration/plans/platform/implementation/documentation-hub-hygiene-v1.md | Wave A migrated from legacy implementation plan. |
| platform | intent-skill-coverage-gate-rule | migrated | documentation/specs/platform/intent-skill-coverage-gate-rule/ | documentation/ai_collaboration/plans/platform/implementation/intent-skill-coverage-gate-rule-v1.md | Wave A migrated from legacy implementation plan. |
| platform | smoke-readonly-trace-observability | migrated | documentation/specs/platform/smoke-readonly-trace-observability/ | documentation/ai_collaboration/plans/platform/implementation/smoke-readonly-trace-observability-v1.md | Wave A migrated from legacy implementation plan. |
| platform | spec-driven-canonical-flow-adoption | migrated | documentation/specs/platform/spec-driven-canonical-flow-adoption/ | documentation/ai_collaboration/plans/platform/implementation/spec-driven-canonical-flow-adoption-v1.md | Wave A migrated from legacy implementation plan. |

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
