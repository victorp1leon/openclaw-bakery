---
name: feature-delivery-flow
description: "Execute end-to-end delivery for missing roadmap features with explicit gates: scope and acceptance criteria, spec-first design/docs, design verification, implementation, unit tests, smoke-integration summary, operational checks, and manual business validation by the user (Instagram). Use when implementing any non-trivial feature across runtime/tools/integrations."
---

# feature-delivery-flow

## Workflow
1. Define scope and done criteria.
- Write a short scope block with:
  - in-scope
  - out-of-scope
  - acceptance criteria
- Define rollback strategy before coding.

2. Prepare design artifacts (spec-first).
- Update or add required docs before implementation:
  - C4 spec(s) for affected tools/components
  - roadmap/system docs if architecture/flows change
  - implementation plan when task is multi-file or risky
- Keep feature assumptions explicit and testable.

3. Verify design before implementation.
- Check compatibility with existing contracts, schemas, and runtime flows.
- Define validation commands up front (unit + smoke + ops checks).
- Identify risky integrations and feature flags needed.

4. Implement in small, verifiable increments.
- Apply minimal safe diffs per file.
- Preserve existing guardrails (`gws`-only, dual-write consistency, live flags).
- Add or adjust tests with each behavior change.

5. Run unit test gate.
- Run focused tests first for touched areas.
- Run broader suite when risk justifies it.
- Stop and fix failures before proceeding.

6. Run smoke/integration gate.
- Generate or refresh summary artifacts:
  - `npm run test:smoke-integration:summary`
- Confirm report totals and failing cases (if any).

7. Run operational checks gate.
- Run `npm run security:scan` when code/config changed.
- Validate relevant `.env` keys when integration behavior depends on config.
- Avoid live mutations unless explicitly requested and gated.

8. Close and hand off.
- Update plan/index/handoff artifacts with exact status.
- Summarize:
  - what changed
  - validation evidence
  - open risks
  - next actions
- Leave explicit checklist for manual Instagram verification by user.

## Recommended Skill Chaining
- Use `docs-plan-handoff` for plan/index/handoff maintenance.
- Use `test-unit` for focused unit validation.
- Use `test-smoke-integration` for smoke/integration summary.
- Use `env-validate` when config quality is relevant.
- Use `release-check` before commit/merge decisions.

## Manual Verification Checklist (Instagram)
- Confirm user-visible text/format in channel responses.
- Confirm expected behavior on at least 3 representative feature scenarios.
- Confirm no unintended side effects in existing flows.
- Confirm business sign-off (explicit user confirmation).

## Completion Rule
- Do not mark feature as complete if any gate is skipped without explicit note and reason.
