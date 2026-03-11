---
name: test-unit
description: Run and summarize unit tests for this project when the user asks for unit validation. Use for focused Vitest runs, full unit runs, and optional markdown summary generation from test results.
---

# test-unit

## Workflow
1. Choose test scope.
- Focused: `npm test -- <path/to/test-file>`.
- Full unit suite: `npm test`.

2. Execute tests.
- Run focused first when debugging.
- Run full suite when user asks for broad validation.

3. Summarize results.
- Always report:
  - total test files
  - total tests
  - passed/failed
  - failing test names (if any)

4. Optional report artifact.
- Generate markdown summary:
  - `npm run test:summary`
- Output files:
  - `reports/test-suite/latest-summary.md`
  - `reports/test-suite/latest-vitest.json`

## Guardrails
- Do not claim tests passed without running them.
- If command fails by environment/network constraints, state it explicitly.
- Keep focused test commands reproducible in output.

## Quick Commands
- Full: `npm test`
- Focused: `npm test -- src/tools/order/orderCardSync.test.ts`
- Summary: `npm run test:summary`
