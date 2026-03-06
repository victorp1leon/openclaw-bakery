# Component Description - Tool Adapters

Status: MVP
Last Updated: 2026-03-05

## Responsibility
Execute external integrations based on actions that were already confirmed by the user.

## Tools
- `append-expense`
- `create-card`
- `append-order`
- `publish-site`

## Design Rules
- No tool executes without prior confirmation.
- Timeouts, retries, and idempotency are configured per tool.
- Tool responses must be structured for logging and user-facing messages.
- Sheets adapters support provider routing (`apps_script` and `gws`) with safe defaults.
