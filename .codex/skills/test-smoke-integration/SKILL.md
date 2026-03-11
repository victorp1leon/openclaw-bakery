---
name: test-smoke-integration
description: Run and summarize smoke and integration validation flows when the user asks to verify end-to-end behavior. Use for mock/default smoke checks, optional live smoke checks, and reading markdown/json summary artifacts.
---

# test-smoke-integration

## Workflow
1. Run default validation (mock-safe).
- Command: `npm run test:smoke-integration:summary`
- This runs smoke scripts in safe/mock mode plus integration tests.

2. Run live validation only when requested.
- Command: `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`
- Requires valid live env/config and network access.

3. Read summary artifacts.
- Human summary: `reports/smoke-integration/latest-summary.md`
- Machine summary: `reports/smoke-integration/latest-summary.json`
- Raw logs/history: `reports/smoke-integration/history/`

4. Diagnose failures.
- Start from `Failed Details` in latest summary.
- Open matching `history/<timestamp>-*.log` file.
- Re-run only the failing smoke command (`npm run smoke:<name>`) if needed.

## Common Live Failure Patterns
- `expense_connector_gws_spreadsheet_id_missing`: missing `EXPENSE_GWS_SPREADSHEET_ID`.
- `expense_connector_gws_range_missing`: missing `EXPENSE_GWS_RANGE`.
- `order_trello_card_not_found`: Trello lookup mismatch/indexing delay; inspect card sync logs.

## Guardrails
- Separate smoke/integration results from unit test results.
- Do not hide failed scenarios even if most scenarios pass.
- Report exact failing scenario row as shown in summary table.

## Quick Commands
- Default: `npm run test:smoke-integration:summary`
- Live: `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`
- Lifecycle only: `npm run smoke:lifecycle`
