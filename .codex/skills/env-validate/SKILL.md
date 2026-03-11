---
name: env-validate
description: Validate and normalize .env for unit, smoke, and live flows. Use when the user asks to check missing variables, duplicate keys, or configuration errors before running bot flows.
---

# env-validate

## Workflow
1. Run structural checks first.
- Duplicate keys:
  - `awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{c[$1]++} END{for(k in c) if(c[k]>1) print k"="c[k]}' .env | sort`
- Empty required keys (quick scan):
  - `rg -n '^[A-Za-z_][A-Za-z0-9_]*=$' .env`
- Suspicious trailing whitespace:
  - `rg -n '[[:space:]]+$' .env`

2. Validate required keys by execution mode.
- Unit/basic runtime:
  - `NODE_ENV`, `TIMEZONE`, `CHANNEL_MODE`, `OPENCLAW_ENABLE`.
- Smoke integration (default):
  - `SMOKE_CHAT_ID`.
- Live order lifecycle:
  - `ORDER_TRELLO_API_KEY`, `ORDER_TRELLO_TOKEN`, `ORDER_TRELLO_LIST_ID`, `ORDER_TRELLO_CANCEL_LIST_ID`.
  - `ORDER_SHEETS_PROVIDER=gws`, `ORDER_SHEETS_GWS_SPREADSHEET_ID`, `ORDER_SHEETS_GWS_RANGE`.
  - `ORDER_SHEETS_GWS_COMMAND`, `ORDER_SHEETS_GWS_COMMAND_ARGS`.
- Live expense:
  - `EXPENSE_SHEETS_PROVIDER=gws`, `EXPENSE_GWS_SPREADSHEET_ID`, `EXPENSE_GWS_RANGE`.

3. Validate GWS auth when live is requested.
- `npm run gws:auth:status`

4. Apply targeted normalization.
- Keep one definition per key.
- Group by section (`core`, `integrations`, `smoke`).
- Preserve effective values unless the user requests behavior changes.

5. Re-run structural checks and report only actionable issues.

## Guardrails
- Never expose full secret values in summaries.
- Do not commit `.env`.
- Do not run live smoke/tests unless the user asks for live validation.

## Quick Commands
- Full smoke/integration readiness:
  - `npm run test:smoke-integration:summary`
- Live smoke/integration readiness:
  - `SMOKE_SUMMARY_LIVE=1 npm run test:smoke-integration:summary`
