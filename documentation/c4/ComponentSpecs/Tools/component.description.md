# Component Description - Tool Adapters

Status: MVP
Last Updated: 2026-03-17

## Responsibility
Execute external integrations based on actions that were already confirmed by the user.

## Tools
- `append-expense`
- `create-card`
- `append-order`
- `update-order`
- `cancel-order`
- `record-payment`
- `report-orders`
- `lookup-order`
- `publish-site`
- `order-status`
- `shopping-list-generate`
- `schedule-day-view`

## Design Rules
- Mutating tools execute only after prior confirmation.
- Read-only tools (`report-orders`, `lookup-order`, `order-status`, `shopping-list-generate`, `schedule-day-view`) may execute without confirmation.
- Timeouts, retries, and idempotency are configured per tool.
- Tool responses must be structured for logging and user-facing messages.
- Sheets adapters use `gws` as the only Google integration path.
- `shopping-list-generate` reads orders from `Pedidos` and can resolve recipe profiles from `CatalogoRecetas` (`gws`) in live mode, keeping `inline` recipes as safe fallback mode for smoke/mock.
- `schedule-day-view` reads orders from `Pedidos` and returns operational blocks (deliveries, preparation, suggested purchases) plus visible `inconsistencies`; delivery date source is `fecha_hora_entrega_iso` (mandatory), with recipe suggestions from `CatalogoRecetas` (`gws`) and inline fallback for unmapped products.
