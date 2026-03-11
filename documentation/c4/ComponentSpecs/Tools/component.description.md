# Component Description - Tool Adapters

Status: MVP
Last Updated: 2026-03-11

## Responsibility
Execute external integrations based on actions that were already confirmed by the user.

## Tools
- `append-expense`
- `create-card`
- `append-order`
- `update-order`
- `cancel-order`
- `report-orders`
- `lookup-order`
- `publish-site`
- `order-status`
- `record-payment` (draft, planned)

## Design Rules
- Mutating tools execute only after prior confirmation.
- Read-only tools (`report-orders`, `lookup-order`, `order-status`) may execute without confirmation.
- Timeouts, retries, and idempotency are configured per tool.
- Tool responses must be structured for logging and user-facing messages.
- Sheets adapters support provider routing (`apps_script` and `gws`) with safe defaults.
