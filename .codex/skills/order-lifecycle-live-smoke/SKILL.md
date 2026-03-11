---
name: order-lifecycle-live-smoke
description: Run and validate live order lifecycle smoke flows (create, update, cancel) with Trello and Google Sheets consistency checks.
---

# order-lifecycle-live-smoke

## Workflow
1. Preflight before live run.
- Confirm `SMOKE_LIFECYCLE_LIVE=1`.
- Confirm required connectors are set:
  - Trello: `ORDER_TRELLO_API_KEY`, `ORDER_TRELLO_TOKEN`, `ORDER_TRELLO_LIST_ID`, `ORDER_TRELLO_CANCEL_LIST_ID`.
  - Sheets (GWS): `ORDER_SHEETS_PROVIDER=gws`, `ORDER_SHEETS_GWS_SPREADSHEET_ID`, `ORDER_SHEETS_GWS_RANGE`.
- Optional auth check:
  - `npm run gws:auth:status`

2. Run lifecycle smoke.
- Command:
  - `npm run smoke:lifecycle`

3. If confirm retry appears, inspect operation and retry path.
- Watch for:
  - `No se pudo ejecutar el pedido. operation_id: ...`
  - `Hay una operación pendiente (...)`
- Retry with explicit confirmation in the same chat/session when requested by the flow.

4. Validate post-conditions.
- Sheets row exists for folio and reflects expected state transitions.
- Trello card exists and matches expected list after cancel (`Pedidos - Cancelados`).
- Notes/comments include operation trace where applicable.

5. Generate suite-level summary when needed.
- `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`
- Review:
  - `reports/smoke-integration/latest-summary.md`
  - `reports/smoke-integration/latest-summary.json`

## Failure Triage Pointers
- `order_trello_card_not_found`: verify `trello_card_id` sync and card lookup path.
- `order_cancel_payload_json_invalid`: fix malformed JSON payload/quoting in smoke inputs.
- `operation pending`: resolve prior pending operation before starting a new one.

## Guardrails
- Do not run live lifecycle without explicit user confirmation.
- Treat partial success as failure until sync/rollback is verified.
- Do not hide flaky retries; report attempt count and final outcome.

## Quick Commands
- Lifecycle only: `npm run smoke:lifecycle`
- Full live smoke summary: `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`
