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
| platform | codex-skill-registry-sync-automation | migrated | documentation/specs/platform/codex-skill-registry-sync-automation/ | documentation/ai_collaboration/plans/platform/implementation/codex-skill-registry-sync-automation.md | Migrated from legacy implementation plan. |
| platform | documentation-hub-hygiene | migrated | documentation/specs/platform/documentation-hub-hygiene/ | documentation/ai_collaboration/plans/platform/implementation/documentation-hub-hygiene-v1.md | Migrated from legacy implementation plan. |
| platform | intent-skill-coverage-gate-rule | migrated | documentation/specs/platform/intent-skill-coverage-gate-rule/ | documentation/ai_collaboration/plans/platform/implementation/intent-skill-coverage-gate-rule-v1.md | Migrated from legacy implementation plan. |
| platform | smoke-readonly-trace-observability | migrated | documentation/specs/platform/smoke-readonly-trace-observability/ | documentation/ai_collaboration/plans/platform/implementation/smoke-readonly-trace-observability-v1.md | Migrated from legacy implementation plan. |
| platform | spec-driven-canonical-flow-adoption | migrated | documentation/specs/platform/spec-driven-canonical-flow-adoption/ | documentation/ai_collaboration/plans/platform/implementation/spec-driven-canonical-flow-adoption-v1.md | Migrated from legacy implementation plan. |
| runtime | bot-persona-and-telegram-ux | migrated | documentation/specs/runtime/bot-persona-and-telegram-ux/ | documentation/ai_collaboration/plans/runtime/implementation/phase2-bot-persona-and-telegram-ux.md | Migrated from legacy implementation plan. |
| runtime | expense-order-grill-hardening | migrated | documentation/specs/runtime/expense-order-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase2-3-expense-order-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | gws-read-helper-refactor | migrated | documentation/specs/runtime/gws-read-helper-refactor/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-gws-read-helper-refactor-v1.md | Migrated from legacy implementation plan. |
| runtime | help-message-and-tipo-envio-normalization | migrated | documentation/specs/runtime/help-message-and-tipo-envio-normalization/ | documentation/ai_collaboration/plans/runtime/implementation/phase1-help-message-and-tipo-envio-normalization.md | Migrated from legacy implementation plan. |
| runtime | inventory-consume-spec-first-foundation | migrated | documentation/specs/runtime/inventory-consume-spec-first-foundation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-consume-spec-first-foundation.md | Migrated from legacy implementation plan. |
| runtime | inventory-tabs-bootstrap-automation | migrated | documentation/specs/runtime/inventory-tabs-bootstrap-automation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-tabs-bootstrap-automation.md | Migrated from legacy implementation plan. |
| runtime | mutation-skills-parser-extraction | migrated | documentation/specs/runtime/mutation-skills-parser-extraction/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-mutation-skills-parser-extraction-v1.md | Migrated from legacy implementation plan. |
| runtime | openclaw-readonly-routing-expansion | migrated | documentation/specs/runtime/openclaw-readonly-routing-expansion/ | documentation/ai_collaboration/plans/runtime/implementation/openclaw-readonly-routing-expansion-v1.md | Migrated from legacy implementation plan. |
| runtime | order-cancel-grill-hardening | migrated | documentation/specs/runtime/order-cancel-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-cancel-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-delivery-datetime-canonical-mx | migrated | documentation/specs/runtime/order-delivery-datetime-canonical-mx/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-canonical-mx-v1.md | Migrated from legacy implementation plan. |
| runtime | order-delivery-datetime-iso | migrated | documentation/specs/runtime/order-delivery-datetime-iso/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-iso.md | Migrated from legacy implementation plan. |
| runtime | order-lifecycle-skills-spec-first | migrated | documentation/specs/runtime/order-lifecycle-skills-spec-first/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lifecycle-skills-spec-first.md | Migrated from legacy implementation plan. |
| runtime | order-lookup-grill-hardening | migrated | documentation/specs/runtime/order-lookup-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lookup-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-lookup-skill-and-report-smokes | migrated | documentation/specs/runtime/order-lookup-skill-and-report-smokes/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lookup-skill-and-report-smokes.md | Migrated from legacy implementation plan. |
| runtime | order-report-grill-hardening | migrated | documentation/specs/runtime/order-report-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-report-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-status-grill-hardening | migrated | documentation/specs/runtime/order-status-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-status-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-update-grill-closure | migrated | documentation/specs/runtime/order-update-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-update-grill-closure-v1.md | Migrated from legacy implementation plan. |
| runtime | payment-record-grill-closure | migrated | documentation/specs/runtime/payment-record-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-payment-record-grill-closure-v1.md | Migrated from legacy implementation plan. |
| runtime | pricing-catalog-tab-hardening | migrated | documentation/specs/runtime/pricing-catalog-tab-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-pricing-catalog-tab-hardening.md | Migrated from legacy implementation plan. |
| runtime | quote-guided-catalog-options-prompts | migrated | documentation/specs/runtime/quote-guided-catalog-options-prompts/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-guided-catalog-options-prompts-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-order-grill-closure | migrated | documentation/specs/runtime/quote-order-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-grill-closure-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-order-gws-catalog | migrated | documentation/specs/runtime/quote-order-gws-catalog/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-gws-catalog-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-pricing-catalog-sheets-tab-foundation | migrated | documentation/specs/runtime/quote-pricing-catalog-sheets-tab-foundation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-pricing-catalog-sheets-tab-foundation.md | Migrated from legacy implementation plan. |
| runtime | quote-readonly-cancel-guard | migrated | documentation/specs/runtime/quote-readonly-cancel-guard/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-readonly-cancel-guard-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-to-order-create-flow | migrated | documentation/specs/runtime/quote-to-order-create-flow/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-to-order-create-flow-v1.md | Migrated from legacy implementation plan. |
| runtime | recipes-catalog-bootstrap-automation | migrated | documentation/specs/runtime/recipes-catalog-bootstrap-automation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-recipes-catalog-bootstrap-automation.md | Migrated from legacy implementation plan. |
| runtime | report-orders-flexible-periods | migrated | documentation/specs/runtime/report-orders-flexible-periods/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-report-orders-flexible-periods-v2.md | Migrated from legacy implementation plan. |
| runtime | report-orders-gws | migrated | documentation/specs/runtime/report-orders-gws/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-report-orders-gws-v1.md | Migrated from legacy implementation plan. |
| runtime | report-year-and-lookup-smoke | migrated | documentation/specs/runtime/report-year-and-lookup-smoke/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-report-year-and-lookup-smoke.md | Migrated from legacy implementation plan. |
| runtime | schedule-day-view-grill-closure | migrated | documentation/specs/runtime/schedule-day-view-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-grill-closure-v2.md | Migrated from legacy implementation plan. |
| runtime | schedule-day-view-risk-hardening | migrated | documentation/specs/runtime/schedule-day-view-risk-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-risk-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | schedule-day-view-spec-driven-pilot | migrated | documentation/specs/runtime/schedule-day-view-spec-driven-pilot/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-spec-driven-pilot-v1.md | Migrated from legacy implementation plan. |
| runtime | sheets-bootstrap-gws-utils-refactor | migrated | documentation/specs/runtime/sheets-bootstrap-gws-utils-refactor/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-bootstrap-gws-utils-refactor.md | Migrated from legacy implementation plan. |
| runtime | sheets-bootstrap-safe-preview-commands | migrated | documentation/specs/runtime/sheets-bootstrap-safe-preview-commands/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-bootstrap-safe-preview-commands.md | Migrated from legacy implementation plan. |
| runtime | sheets-schema-bootstrap-foundation | migrated | documentation/specs/runtime/sheets-schema-bootstrap-foundation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-schema-bootstrap-foundation.md | Migrated from legacy implementation plan. |
| runtime | sheets-schema-validation-hardening | migrated | documentation/specs/runtime/sheets-schema-validation-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-schema-validation-hardening.md | Migrated from legacy implementation plan. |
| runtime | shopping-list-generate | migrated | documentation/specs/runtime/shopping-list-generate/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-generate-v1.md | Migrated from legacy implementation plan. |
| runtime | shopping-list-operational-hardening | migrated | documentation/specs/runtime/shopping-list-operational-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-operational-hardening-v2.md | Migrated from legacy implementation plan. |
| runtime | shopping-list-recipes-gws-live | migrated | documentation/specs/runtime/shopping-list-recipes-gws-live/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-recipes-gws-live-v1.md | Migrated from legacy implementation plan. |
| runtime | skill-doc-coverage-parity | migrated | documentation/specs/runtime/skill-doc-coverage-parity/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-skill-doc-coverage-parity-v1.md | Migrated from legacy implementation plan. |
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
