---
name: phase3-intent-delivery
description: "Deliver new roadmap intents (phase 3+) with a fixed gate sequence: spec-first docs, runtime/tool wiring, unit tests, smoke script + summary registration, and plan/handoff closure. Use for intents like shopping.list.generate, inventory.consume, schedule.* and similar."
---

# phase3-intent-delivery

## When to Use
- Implementing a new conversational intent that touches runtime/tools/docs.
- Extending an existing intent with behavior changes that require test and smoke updates.
- Working on roadmap items in phase 3+ (`inventory.consume`, `schedule.*`, `report.reminders`, similar).

## Required Workflow
1. Define intent contract and risk profile.
- Declare `read-only` vs `mutation`.
- Define acceptance criteria and rollback plan before coding.

2. Apply spec-first updates.
- Update/add relevant canonical component contracts before implementation:
  - `documentation/specs/contracts/components/*.spec.md` (tool/runtime contracts touched by the intent)
  - `documentation/specs/contracts/components/conversation-processor.spec.md`
- Align roadmap/coverage docs:
  - `documentation/bot-bakery.roadmap.md`
  - `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md`
  - `documentation/ai_collaboration/system-map.md` (if flow map changes)

3. Implement runtime + tool wiring.
- Tool implementation in `src/tools/**`.
- Runtime routing/state in `src/runtime/conversationProcessor.ts`.
- Prompt copy updates in `src/runtime/persona.ts` when missing-field prompts change.
- Dependency wiring in `src/index.ts` if new executor hooks are introduced.

4. Add/adjust tests.
- Tool tests in `src/tools/**.test.ts`.
- Runtime tests in `src/runtime/conversationProcessor.test.ts`.
- For mutation intents, include confirm/cancel/idempotency behavior checks.

5. Add smoke coverage for the new intent.
- Create `scripts/smoke/<intent>-smoke.ts`.
- Register npm script in `package.json` (example: `smoke:inventory`).
- Register scenario in `scripts/tests/generate-smoke-integration-summary.ts` (`smokeCommands` array).
- Add safe defaults for mock mode (`SMOKE_*_LIVE=0`, `*_DRY_RUN=1` when applicable).

6. Run validation gates.
- Focused unit tests first (tool + runtime touched paths).
- Full smoke summary: `npm run test:smoke-integration:summary`.
- Security scan when code/config changes: `npm run security:scan`.

7. Close collaboration artifacts.
- Create/update implementation plan.
- Update plans index.
- Write short session handoff with evidence and next steps.

## Definition of Done (Intent-Level)
- Specs updated and consistent with behavior.
- Runtime route + tool execution works for happy path and key errors.
- Unit tests pass for touched areas.
- New intent appears in smoke summary output.
- Plan/index/handoff are aligned.

## Guardrails
- Do not skip smoke registration for new intents.
- Do not run live mutating smoke by default.
- Do not mark complete if any mandatory gate is pending.

## Recommended Skill Chaining
- `feature-delivery-flow`: high-level feature orchestration.
- `docs-plan-handoff`: plan/index/handoff maintenance.
- `test-unit`: focused unit execution.
- `test-smoke-integration`: smoke/integration summary execution.

## Reference
- Use checklist: `references/intent-checklist.md`
