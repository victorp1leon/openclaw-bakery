# Session Handoff: Phase 3 Order Trello+Sheets Consistency v1 - 2026-03-11

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/phase3-order-lifecycle-skills-spec-first.md`
> **Date:** `2026-03-11`
> **Owner:** `Codex + Dev`

## What Was Done
- Se implemento sincronizacion Trello+Sheets para mutaciones de pedidos ya existentes:
  - `order.update`: sincroniza Trello (due/comment) + Sheets (`gws`) con rollback de Trello si falla Sheets.
  - `order.cancel`: mueve tarjeta a lista de cancelados + comentario en Trello, y muta Sheets (`[CANCELADO]` + `estado_pedido=cancelado`) con rollback si falla Sheets.
- Se agrego rollback interno en `orderCardSync` para fallos parciales dentro de Trello (ej. mover/actualizar tarjeta y luego fallar en comentario).
- Se completo consistencia para `order.create`:
  - si se crea tarjeta nueva y luego falla `append-order`, se elimina tarjeta para revertir.
- Se amplio esquema en Sheets para lifecycle:
  - nuevas columnas `estado_pedido` y `trello_card_id`.
  - `append-order` escribe ambos campos por defecto (`activo`, `trello_card_id` cuando exista).
  - `order.update`/`order.cancel` preservan ancho de escritura hasta `A:U`.
- Se agrego validacion de config operativa:
  - nuevo env `ORDER_TRELLO_CANCEL_LIST_ID`.
  - `healthcheck` exige `cancelListId` cuando `ORDER_TRELLO_DRY_RUN=0`.
- Se actualizo documentacion tecnica y de colaboracion:
  - specs C4 de `update-order`, `cancel-order`, `conversation-processor`.
  - `system-map`, matriz DDD, config matrix y skills `order.update` / `order.cancel`.
- Se ajustaron `scripts/smoke/update-smoke.ts` y `scripts/smoke/cancel-smoke.ts` para que en modo `live` prueben tambien el sync de Trello (no solo Sheets) via `orderCardSync`.
- Se agrego persistencia de `trello_card_id` en mutaciones de filas legacy:
  - `order.update` ahora backfillea `trello_card_id` y completa `estado_pedido=activo` si estaba vacio.
  - `order.cancel` ahora escribe `trello_card_id` y `estado_pedido=cancelado` incluso en casos ya cancelados cuando falte ese dato.

## Validation
- Tests ejecutados:
  - `npm test -- src/tools/order/orderCardSync.test.ts src/tools/order/appendOrder.test.ts src/tools/order/updateOrder.test.ts src/tools/order/cancelOrder.test.ts src/tools/order/orderStatus.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts src/health/healthcheck.test.ts` ✅
  - Resultado: `8 files`, `98 tests` passed.
- Smoke:
  - `npm run smoke:update && npm run smoke:cancel` en este entorno fallo en live por limitacion de red/DNS del sandbox (`gws` auth/token lookup), no por regresion funcional del runtime.

## Current State
- `order.create`, `order.update` y `order.cancel` quedan con regla de consistencia operativa Trello+Sheets y rollback.
- Flujo de cancelacion en Trello requiere `ORDER_TRELLO_CANCEL_LIST_ID` configurado en live.
- Plan de lifecycle permanece `In Progress` por pendiente de `payment.record`.

## Open Issues
- Smokes live no son deterministas dentro de sandbox sin red saliente estable para `gws`/Google APIs.
- Pedidos legacy sin marcador/relacion trazable con Trello pueden requerir referencia mas fuerte (`operation_id_ref` o `trello_card_id`) para sync robusto.

## Next Steps
1. Ejecutar smoke live fuera del sandbox con `ORDER_TRELLO_CANCEL_LIST_ID` configurado y registrar evidencia operacional.
2. Implementar `payment.record` con la misma regla de consistencia y rollback.
3. Definir estrategia de backfill para `trello_card_id` en pedidos legacy si se detectan misses de trazabilidad.

## Key Decisions
- Se formalizo consistencia transaccional a nivel aplicacion para mutaciones de pedidos: ambos conectores (Trello + Sheets) deben converger o se revierte.
- Se priorizo rollback de Trello (snapshot/delete) sobre rollback de Sheets para minimizar riesgo operacional en tablero de trabajo diario.
