# Rule: Order Dual-Write Strict

## Policy
- Operaciones mutantes de pedido (`create`, `update`, `cancel`) solo se consideran exitosas cuando Trello y Sheets concluyen correctamente.
- Si un lado falla, debe ejecutarse rollback del otro y retornar error operacional trazable.

## Applies To
- `src/tools/order/appendOrder*`
- `src/tools/order/updateOrder*`
- `src/tools/order/cancelOrder*`
- `src/tools/order/orderCardSync*`
- `src/runtime/conversationProcessor*`

## Verification
- Tests unitarios de sincronizacion/rollback en `src/tools/order/*.test.ts`.
- Smoke/integration:
  - `npm run test:smoke-integration:summary`
- En live, validar post-condicion en ambos sistemas (Trello + Sheets).

## Notes
- Esta regla esta alineada con specs `update-order.spec.md` y `cancel-order.spec.md`.
