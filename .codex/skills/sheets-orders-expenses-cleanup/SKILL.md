---
name: sheets-orders-expenses-cleanup
description: Safely preview, apply, and verify cleanup of Google Sheets tabs Pedidos and Gastos (clear data rows and restore canonical headers) for test-data resets.
---

# sheets-orders-expenses-cleanup

## Workflow
1. Run preview first (no mutations).
- Command:
  - `npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode preview`
- Review:
  - rows detected in `Pedidos` and `Gastos`
  - `clearRange` and `headerRange`
  - current vs canonical headers

2. Apply only with explicit business approval.
- Command:
  - `npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode apply`
- Effect:
  - Clears `Pedidos` data rows (`A2:U`) and rewrites canonical header (`A1:U1`)
  - Clears `Gastos` data rows (`A2:J`) and rewrites canonical header (`A1:J1`)

3. Verify final state after apply.
- Command:
  - `npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode verify`
- Confirm:
  - `totalRows = 0` for both tabs (or expected live count)
  - `headerMatch = true` for both tabs

## Canonical Headers
- `Pedidos` (21):
  - `fecha_registro, folio, fecha_hora_entrega, nombre_cliente, telefono, producto, descripcion_producto, cantidad, sabor_pan, sabor_relleno, tipo_envio, direccion, estado_pago, total, moneda, notas, chat_id, operation_id, fecha_hora_entrega_iso, estado_pedido, trello_card_id`
- `Gastos` (10):
  - `fecha, monto, moneda, concepto, categoria, metodo_pago, proveedor, notas, chat_id, operation_id`

## Guardrails
- Treat `--mode apply` as live mutation over external Sheets.
- Always use `preview` before `apply`.
- Do not run apply without explicit user confirmation in-session.
- Do not override canonical headers ad-hoc; update skill script and document changes if contract evolves.

## Quick Commands
- Preview: `npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode preview`
- Apply: `npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode apply`
- Verify: `npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode verify`
