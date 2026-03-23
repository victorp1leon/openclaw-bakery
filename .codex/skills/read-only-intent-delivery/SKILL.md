---
name: read-only-intent-delivery
description: Deliver read-only intents end-to-end with consistent patterns for deterministic routing, optional missing-field prompts, tool execution without confirmation flow, reply formatting, tests, smoke registration, and docs/plan closure. Use for intents like schedule.day_view, report.reminders, and similar query/reporting capabilities.
---

# read-only-intent-delivery

## When to Use
- Implementing a new read-only intent that queries data and must not mutate external systems.
- Extending an existing read-only intent with behavior changes that require runtime/tool/test/smoke updates.
- Shipping phase 3+ reporting/scheduling/customer lookup style capabilities.

## Required Workflow
1. Define intent contract and scope.
- Confirm read-only behavior and explicit out-of-scope mutations.
- Define required output blocks and deterministic error tokens.
- Define operational traceability contract:
  - Success payload includes `trace_ref`.
  - Partial-data conditions are surfaced in `inconsistencies[]` (never silently dropped).
  - Failure replies include user-visible `Ref: <trace_ref>` without raw internals.

2. Apply spec-first updates.
- Update/add tool contract in `documentation/specs/contracts/components/*.spec.md`.
- Update runtime contract in `documentation/specs/contracts/components/conversation-processor.spec.md`.
- Align `roadmap`, `ddd-roadmap-coverage-matrix`, and `system-map` if coverage/state changes.

3. Implement tool logic.
- Add tool in `src/tools/**` using `readGwsValuesWithRetries` for Sheets reads when applicable.
- Keep deterministic filtering/sorting and sanitized error mapping.
- Never perform write operations in this tool.

4. Wire runtime flow.
- Add deterministic detection in `src/runtime/conversationProcessor.ts`.
- Route without `confirmar/cancelar` flow.
- If scope/date/query is missing, use pending state + `copy.askFor(...)` for one missing item.

5. Add UX and observability.
- Add/adjust prompt copy in `src/runtime/persona.ts` when missing-field prompts change.
- Add readable formatter for intent response blocks.
- Emit `*_succeeded` / `*_failed` traces with minimal safe detail.
- Ensure runtime replies include `trace_ref` in both success and controlled-failure paths.

6. Add/adjust tests.
- Tool tests in `src/tools/**.test.ts`.
- Runtime tests in `src/runtime/conversationProcessor.test.ts`.
- Include cases for: happy path, missing scope/query, deterministic failures, and no-confirm routing.
- Include read-only hardening cases:
  - partial data represented via `inconsistencies[]`,
  - deterministic `trace_ref` presence in success and failure replies.

7. Add smoke coverage.
- Create `scripts/smoke/<intent>-smoke.ts`.
- Register npm script in `package.json`.
- Register scenario in `scripts/tests/generate-smoke-integration-summary.ts`.
- Keep mock-safe defaults (`SMOKE_*_LIVE=0`).

8. Validate and close artifacts.
- Run focused unit tests.
- Run intent smoke and full `test:smoke-integration:summary`.
- Run `security:scan` when code/config changed.
- Update plan/index/handoff for traceable closure.

## Definition of Done (Read-Only Intent)
- Tool + runtime behavior match specs.
- No confirmation flow is required for intent execution.
- No external mutation happens during execution.
- `trace_ref` and `inconsistencies[]` contract is implemented, documented, and tested.
- Tests and smoke pass and are registered in summary.
- Docs and collaboration artifacts are synchronized.

## Guardrails
- Do not add mutation side effects to read-only intents.
- Do not bypass deterministic missing-field handling.
- Do not expose credentials, raw stderr, or provider internals in replies.
- Do not return opaque read-only failures without `Ref: <trace_ref>`.
- Do not mark complete while validation gates are pending.
