# Specs Index (Canonical SDD)

Status: In Progress
Last Updated: 2026-03-25

## Purpose
Canonical registry for feature specs under `documentation/specs`.
This index tracks migrated/verified and new SDD-native features by domain.

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
| platform | agents-scaffolding-foundation | verified | documentation/specs/platform/agents-scaffolding-foundation/ | documentation/ai_collaboration/plans/platform/implementation/agents-scaffolding-foundation.md | Migrated from legacy implementation plan. |
| platform | ai-first-documentation-publication-readiness | verified | documentation/specs/platform/ai-first-documentation-publication-readiness/ | documentation/ai_collaboration/plans/platform/implementation/ai-first-documentation-publication-readiness.md | Migrated from legacy implementation plan. |
| platform | audit-prompt-and-audit-skill-alignment | verified | documentation/specs/platform/audit-prompt-and-audit-skill-alignment/ | documentation/ai_collaboration/plans/platform/implementation/audit-prompt-and-audit-skill-alignment.md | Migrated from legacy implementation plan. |
| platform | code-review-graph-integration | verified | documentation/specs/platform/code-review-graph-integration/ | N/A | Integracion cerrada: adapter seguro + runtime wiring + smoke/integration summary en verde. |
| platform | codex-collaboration-rollout | verified | documentation/specs/platform/codex-collaboration-rollout/ | documentation/ai_collaboration/plans/platform/implementation/codex-collaboration-rollout.md | Migrated from legacy implementation plan. |
| platform | codex-skill-registry-sync-automation | verified | documentation/specs/platform/codex-skill-registry-sync-automation/ | documentation/ai_collaboration/plans/platform/implementation/codex-skill-registry-sync-automation.md | Migrated from legacy implementation plan. |
| platform | codex-skills-rules-acceleration-foundation | verified | documentation/specs/platform/codex-skills-rules-acceleration-foundation/ | documentation/ai_collaboration/plans/platform/implementation/codex-skills-rules-acceleration-foundation.md | Migrated from legacy implementation plan. |
| platform | copilot-instructions-adaptation-foundation | verified | documentation/specs/platform/copilot-instructions-adaptation-foundation/ | documentation/ai_collaboration/plans/platform/implementation/copilot-instructions-adaptation-foundation.md | Migrated from legacy implementation plan. |
| platform | ddd-roadmap-design-coverage-matrix | verified | documentation/specs/platform/ddd-roadmap-design-coverage-matrix/ | documentation/ai_collaboration/plans/platform/implementation/ddd-roadmap-design-coverage-matrix.md | Migrated from legacy implementation plan. |
| platform | documentation-hub-hygiene | verified | documentation/specs/platform/documentation-hub-hygiene/ | documentation/ai_collaboration/plans/platform/implementation/documentation-hub-hygiene-v1.md | Migrated from legacy implementation plan. |
| platform | documentation-ia-industry-alignment | verified | documentation/specs/platform/documentation-ia-industry-alignment/ | documentation/ai_collaboration/plans/platform/implementation/documentation-ia-industry-alignment.md | Migrated from legacy implementation plan. |
| platform | ecc-security-first-adoption | verified | documentation/specs/platform/ecc-security-first-adoption/ | documentation/ai_collaboration/plans/platform/implementation/ecc-security-first-adoption.md | Migrated from legacy implementation plan. |
| platform | expense-api-key-hardening | verified | documentation/specs/platform/expense-api-key-hardening/ | documentation/ai_collaboration/plans/platform/implementation/phase2-expense-api-key-hardening.md | Migrated from legacy implementation plan. |
| platform | expense-e2e-implementation | verified | documentation/specs/platform/expense-e2e-implementation/ | documentation/ai_collaboration/plans/platform/implementation/phase2-expense-e2e-implementation.md | Migrated from legacy implementation plan. |
| platform | expense-smoke-validation | verified | documentation/specs/platform/expense-smoke-validation/ | documentation/ai_collaboration/plans/platform/implementation/phase2-expense-smoke-validation.md | Migrated from legacy implementation plan. |
| platform | framework-docs-externalization | verified | documentation/specs/platform/framework-docs-externalization/ | documentation/ai_collaboration/plans/platform/implementation/framework-docs-externalization.md | Migrated from legacy implementation plan. |
| platform | gitleaks-history-scan-foundation | verified | documentation/specs/platform/gitleaks-history-scan-foundation/ | documentation/ai_collaboration/plans/platform/implementation/gitleaks-history-scan-foundation.md | Migrated from legacy implementation plan. |
| platform | intent-skill-coverage-gate-rule | verified | documentation/specs/platform/intent-skill-coverage-gate-rule/ | documentation/ai_collaboration/plans/platform/implementation/intent-skill-coverage-gate-rule-v1.md | Migrated from legacy implementation plan. |
| platform | meta-governance-instructions-adoption | verified | documentation/specs/platform/meta-governance-instructions-adoption/ | documentation/ai_collaboration/plans/platform/implementation/meta-governance-instructions-adoption.md | Migrated from legacy implementation plan. |
| platform | order-connectors-e2e-implementation | verified | documentation/specs/platform/order-connectors-e2e-implementation/ | documentation/ai_collaboration/plans/platform/implementation/phase3-order-connectors-e2e-implementation.md | Migrated from legacy implementation plan. |
| platform | order-connectors-spec-v2-foundation | verified | documentation/specs/platform/order-connectors-spec-v2-foundation/ | documentation/ai_collaboration/plans/platform/implementation/phase3-order-connectors-spec-v2-foundation.md | Migrated from legacy implementation plan. |
| platform | repo-audit-safety-hardening-followup | verified | documentation/specs/platform/repo-audit-safety-hardening-followup/ | documentation/ai_collaboration/plans/platform/implementation/repo-audit-safety-hardening-followup.md | Migrated from legacy implementation plan. |
| platform | repo-structure-hygiene-foundation | verified | documentation/specs/platform/repo-structure-hygiene-foundation/ | documentation/ai_collaboration/plans/platform/implementation/repo-structure-hygiene-foundation.md | Migrated from legacy implementation plan. |
| platform | sheets-gws-cli-adoption | verified | documentation/specs/platform/sheets-gws-cli-adoption/ | documentation/ai_collaboration/plans/platform/implementation/phase2-3-sheets-gws-cli-adoption.md | Migrated from legacy implementation plan. |
| platform | site-branding-facebook-import-utility | verified | documentation/specs/platform/site-branding-facebook-import-utility/ | documentation/ai_collaboration/plans/platform/implementation/phase4-site-branding-facebook-import-utility.md | Migrated from legacy implementation plan. |
| platform | site-conversion-wireframe-alignment | verified | documentation/specs/platform/site-conversion-wireframe-alignment/ | documentation/ai_collaboration/plans/platform/implementation/phase4-site-conversion-wireframe-alignment.md | Migrated from legacy implementation plan. |
| platform | site-static-scaffold-content-driven | verified | documentation/specs/platform/site-static-scaffold-content-driven/ | documentation/ai_collaboration/plans/platform/implementation/phase4-site-static-scaffold-content-driven.md | Migrated from legacy implementation plan. |
| platform | site-ui-qa-mcp-alignment | verified | documentation/specs/platform/site-ui-qa-mcp-alignment/ | documentation/ai_collaboration/plans/platform/implementation/phase4-site-ui-qa-mcp-alignment.md | Migrated from legacy implementation plan. |
| platform | smoke-readonly-trace-observability | verified | documentation/specs/platform/smoke-readonly-trace-observability/ | documentation/ai_collaboration/plans/platform/implementation/smoke-readonly-trace-observability-v1.md | Migrated from legacy implementation plan. |
| platform | spec-driven-canonical-flow-adoption | verified | documentation/specs/platform/spec-driven-canonical-flow-adoption/ | documentation/ai_collaboration/plans/platform/implementation/spec-driven-canonical-flow-adoption-v1.md | Migrated from legacy implementation plan. |
| platform | web-catalog-facebook-definition | verified | documentation/specs/platform/web-catalog-facebook-definition/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-catalog-facebook-definition.md | Migrated from legacy implementation plan. |
| platform | web-content-driven-mode | verified | documentation/specs/platform/web-content-driven-mode/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-content-driven-mode.md | Migrated from legacy implementation plan. |
| platform | web-local-publish-webhook | verified | documentation/specs/platform/web-local-publish-webhook/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-local-publish-webhook.md | Migrated from legacy implementation plan. |
| platform | web-netlify-public-publish | verified | documentation/specs/platform/web-netlify-public-publish/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-netlify-public-publish.md | Migrated from legacy implementation plan. |
| platform | web-publish-adapter-implementation | verified | documentation/specs/platform/web-publish-adapter-implementation/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-publish-adapter-implementation.md | Migrated from legacy implementation plan. |
| platform | web-publish-netlify-runbook | verified | documentation/specs/platform/web-publish-netlify-runbook/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-publish-netlify-runbook.md | Migrated from legacy implementation plan. |
| platform | web-publish-spec-v2-foundation | verified | documentation/specs/platform/web-publish-spec-v2-foundation/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-publish-spec-v2-foundation.md | Migrated from legacy implementation plan. |
| platform | web-rollback-drill-automation | verified | documentation/specs/platform/web-rollback-drill-automation/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-rollback-drill-automation.md | Migrated from legacy implementation plan. |
| platform | web-runtime-integration | verified | documentation/specs/platform/web-runtime-integration/ | documentation/ai_collaboration/plans/platform/implementation/phase4-web-runtime-integration.md | Migrated from legacy implementation plan. |
| runtime | admin-config-view | verified | documentation/specs/runtime/admin-config-view/ | N/A (new feature) | Fase 6 capability entregado: snapshot sanitizado + routing/runtime + smoke registrados. |
| runtime | admin-allowlist | verified | documentation/specs/runtime/admin-allowlist/ | N/A (new feature) | Fase 6 capability entregado: `view` + mutacion `add/remove` con confirm flow y guardrails operativos. |
| runtime | admin-health | verified | documentation/specs/runtime/admin-health/ | N/A (new feature) | Fase 6 capability entregado: routing + runtime + smoke registrados. |
| runtime | admin-logs | verified | documentation/specs/runtime/admin-logs/ | N/A (new feature) | Fase 6 capability entregado: consulta segura de trazas (`chat_id|operation_id`) + routing/runtime + smoke registrados. |
| runtime | bot-persona-and-telegram-ux | verified | documentation/specs/runtime/bot-persona-and-telegram-ux/ | documentation/ai_collaboration/plans/runtime/implementation/phase2-bot-persona-and-telegram-ux.md | Migrated from legacy implementation plan. |
| runtime | expense-order-grill-hardening | verified | documentation/specs/runtime/expense-order-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase2-3-expense-order-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | gws-read-helper-refactor | verified | documentation/specs/runtime/gws-read-helper-refactor/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-gws-read-helper-refactor-v1.md | Migrated from legacy implementation plan. |
| runtime | help-message-and-tipo-envio-normalization | verified | documentation/specs/runtime/help-message-and-tipo-envio-normalization/ | documentation/ai_collaboration/plans/runtime/implementation/phase1-help-message-and-tipo-envio-normalization.md | Migrated from legacy implementation plan. |
| runtime | inventory-consume-spec-first-foundation | verified | documentation/specs/runtime/inventory-consume-spec-first-foundation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-consume-spec-first-foundation.md | Migrated from legacy implementation plan. |
| runtime | inventory-tabs-bootstrap-automation | verified | documentation/specs/runtime/inventory-tabs-bootstrap-automation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-tabs-bootstrap-automation.md | Migrated from legacy implementation plan. |
| runtime | mutation-skills-parser-extraction | verified | documentation/specs/runtime/mutation-skills-parser-extraction/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-mutation-skills-parser-extraction-v1.md | Migrated from legacy implementation plan. |
| runtime | openclaw-readonly-routing-expansion | verified | documentation/specs/runtime/openclaw-readonly-routing-expansion/ | documentation/ai_collaboration/plans/runtime/implementation/openclaw-readonly-routing-expansion-v1.md | Migrated from legacy implementation plan. |
| runtime | order-cancel-grill-hardening | verified | documentation/specs/runtime/order-cancel-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-cancel-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-delivery-datetime-canonical-mx | verified | documentation/specs/runtime/order-delivery-datetime-canonical-mx/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-canonical-mx-v1.md | Migrated from legacy implementation plan. |
| runtime | order-delivery-datetime-iso | verified | documentation/specs/runtime/order-delivery-datetime-iso/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-iso.md | Migrated from legacy implementation plan. |
| runtime | order-lifecycle-skills-spec-first | verified | documentation/specs/runtime/order-lifecycle-skills-spec-first/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lifecycle-skills-spec-first.md | Migrated from legacy implementation plan. |
| runtime | order-lookup-grill-hardening | verified | documentation/specs/runtime/order-lookup-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lookup-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-lookup-skill-and-report-smokes | verified | documentation/specs/runtime/order-lookup-skill-and-report-smokes/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lookup-skill-and-report-smokes.md | Migrated from legacy implementation plan. |
| runtime | order-report-grill-hardening | verified | documentation/specs/runtime/order-report-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-report-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-status-grill-hardening | verified | documentation/specs/runtime/order-status-grill-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-status-grill-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | order-update-grill-closure | verified | documentation/specs/runtime/order-update-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-order-update-grill-closure-v1.md | Migrated from legacy implementation plan. |
| runtime | payment-record-grill-closure | verified | documentation/specs/runtime/payment-record-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-payment-record-grill-closure-v1.md | Migrated from legacy implementation plan. |
| runtime | pricing-catalog-tab-hardening | verified | documentation/specs/runtime/pricing-catalog-tab-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-pricing-catalog-tab-hardening.md | Migrated from legacy implementation plan. |
| runtime | quote-guided-catalog-options-prompts | verified | documentation/specs/runtime/quote-guided-catalog-options-prompts/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-guided-catalog-options-prompts-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-order-grill-closure | verified | documentation/specs/runtime/quote-order-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-grill-closure-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-order-gws-catalog | verified | documentation/specs/runtime/quote-order-gws-catalog/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-gws-catalog-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-pricing-catalog-sheets-tab-foundation | verified | documentation/specs/runtime/quote-pricing-catalog-sheets-tab-foundation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-pricing-catalog-sheets-tab-foundation.md | Migrated from legacy implementation plan. |
| runtime | quote-readonly-cancel-guard | verified | documentation/specs/runtime/quote-readonly-cancel-guard/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-readonly-cancel-guard-v1.md | Migrated from legacy implementation plan. |
| runtime | quote-to-order-create-flow | verified | documentation/specs/runtime/quote-to-order-create-flow/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-to-order-create-flow-v1.md | Migrated from legacy implementation plan. |
| runtime | recipes-catalog-bootstrap-automation | verified | documentation/specs/runtime/recipes-catalog-bootstrap-automation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-recipes-catalog-bootstrap-automation.md | Migrated from legacy implementation plan. |
| runtime | report-orders-flexible-periods | verified | documentation/specs/runtime/report-orders-flexible-periods/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-report-orders-flexible-periods-v2.md | Migrated from legacy implementation plan. |
| runtime | report-orders-gws | verified | documentation/specs/runtime/report-orders-gws/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-report-orders-gws-v1.md | Migrated from legacy implementation plan. |
| runtime | report-reminders | verified | documentation/specs/runtime/report-reminders/ | N/A (new feature) | Capability `report.reminders` entregado: priorizacion por urgencia + routing read-only + smoke en verde. |
| runtime | report-year-and-lookup-smoke | verified | documentation/specs/runtime/report-year-and-lookup-smoke/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-report-year-and-lookup-smoke.md | Migrated from legacy implementation plan. |
| runtime | schedule-day-view-grill-closure | verified | documentation/specs/runtime/schedule-day-view-grill-closure/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-grill-closure-v2.md | Migrated from legacy implementation plan. |
| runtime | schedule-day-view-risk-hardening | verified | documentation/specs/runtime/schedule-day-view-risk-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-risk-hardening-v1.md | Migrated from legacy implementation plan. |
| runtime | schedule-day-view-spec-driven-pilot | verified | documentation/specs/runtime/schedule-day-view-spec-driven-pilot/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-spec-driven-pilot-v1.md | Migrated from legacy implementation plan. |
| runtime | schedule-week-view | verified | documentation/specs/runtime/schedule-week-view/ | N/A (new feature) | Capability `schedule.week_view` entregado: agregacion semanal read-only + runtime/router/smoke en verde. |
| runtime | sheets-bootstrap-gws-utils-refactor | verified | documentation/specs/runtime/sheets-bootstrap-gws-utils-refactor/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-bootstrap-gws-utils-refactor.md | Migrated from legacy implementation plan. |
| runtime | sheets-bootstrap-safe-preview-commands | verified | documentation/specs/runtime/sheets-bootstrap-safe-preview-commands/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-bootstrap-safe-preview-commands.md | Migrated from legacy implementation plan. |
| runtime | sheets-schema-bootstrap-foundation | verified | documentation/specs/runtime/sheets-schema-bootstrap-foundation/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-schema-bootstrap-foundation.md | Migrated from legacy implementation plan. |
| runtime | sheets-schema-validation-hardening | verified | documentation/specs/runtime/sheets-schema-validation-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-schema-validation-hardening.md | Migrated from legacy implementation plan. |
| runtime | shopping-list-generate | verified | documentation/specs/runtime/shopping-list-generate/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-generate-v1.md | Migrated from legacy implementation plan. |
| runtime | shopping-list-operational-hardening | verified | documentation/specs/runtime/shopping-list-operational-hardening/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-operational-hardening-v2.md | Migrated from legacy implementation plan. |
| runtime | shopping-list-recipes-gws-live | verified | documentation/specs/runtime/shopping-list-recipes-gws-live/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-recipes-gws-live-v1.md | Migrated from legacy implementation plan. |
| runtime | skill-doc-coverage-parity | verified | documentation/specs/runtime/skill-doc-coverage-parity/ | documentation/ai_collaboration/plans/runtime/implementation/phase3-skill-doc-coverage-parity-v1.md | Migrated from legacy implementation plan. |
## Component Contracts Registry
| Domain | Scope | Status | Canonical Path | Legacy Sources | Notes |
|---|---|---|---|---|---|
| contracts | components (`C4-001` to `C4-039`) | verified | documentation/specs/contracts/components/ | documentation/c4/ComponentSpecs/** | Wave C.1 completed with `copy+trace`; Wave D closure verified 1:1 source/target consistency. |

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
