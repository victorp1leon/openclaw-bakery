---
name: order-sync-diagnose
description: Diagnose order synchronization failures between Trello and Google Sheets, including pending operations, rollback errors, and missing card linkage.
---

# order-sync-diagnose

## Workflow
1. Start from latest smoke/integration outputs.
- Read:
  - `reports/smoke-integration/latest-summary.md`
  - `reports/smoke-integration/latest-summary.json`
- Find failing scenario and exact `detail` code.

2. Locate raw logs for the failing run.
- Check:
  - `reports/smoke-integration/history/`
- Open the matching timestamped log and extract:
  - `operation_id`
  - failing event
  - `trace_detail`

3. Map failure code to probable root cause.
- `order_trello_card_not_found`: card id not stored/synced, stale folio mapping, or wrong lookup list.
- `order_update_patch_missing` / `order_cancel_payload_json_invalid`: invalid parse payload shape/quoting.
- `operation pending`: unfinished prior operation in same chat/session.
- `*_gws_*_missing`: missing required GWS env key.
- `*_execute_failed`: downstream connector failure; inspect rollback status and retries.

4. Run focused re-validation.
- Re-run only the failing smoke:
  - `npm run smoke:update`
  - `npm run smoke:cancel`
  - `npm run smoke:lifecycle`
- If needed, rerun summary:
  - `npm run test:smoke-integration:summary`

5. Report concise remediation.
- What failed (scenario + detail code).
- Why it likely failed (1 root cause hypothesis, then fallback).
- Exact env/code fix and the re-test command.

## Guardrails
- Do not claim sync consistency without checking both Trello and Sheets effects.
- Do not skip pending-operation cleanup before re-running live mutating flows.
- Keep evidence linked to concrete log lines/events.

## Quick Commands
- Summary: `npm run test:smoke-integration:summary`
- Live summary: `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`
- Focused re-run: `npm run smoke:update` / `npm run smoke:cancel` / `npm run smoke:lifecycle`
