# Phase 3 - Order Lookup Skill and Report Smokes

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-09`
> **Last Updated:** `2026-03-09`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Report periods v2 | `documentation/ai_collaboration/plans/runtime/implementation/phase3-report-orders-flexible-periods-v2.md` | Base de filtros dia/semana/mes |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Reglas de routing conversacional |
| Tools specs | `documentation/c4/ComponentSpecs/Tools/Specs/` | Contratos `report-orders` y nuevo `lookup-order` |
| Roadmap | `documentation/bot-bakery.roadmap.md` | Cobertura funcional de consultas de pedido |

## Contexto
Se necesita robustecer validacion operativa de reportes por periodos con smoke tests dedicados y agregar una nueva skill de consulta de pedido en modo read-only.

## Alcance
### In Scope
- Agregar smoke test para escenarios de reportes dia/semana/mes.
- Implementar capability `order.lookup` (consulta de pedido por folio/nombre/producto) sobre Sheets `gws`.
- Integrar `order.lookup` en runtime con ruta deterministica de consulta (sin confirm flow).
- Crear skill doc en `skills/order.lookup/SKILL.md`.
- Actualizar specs/documentacion y tests.

### Out of Scope
- Mutaciones de pedido (`order.update`, `order.cancel`).
- Filtros anuales de reportes.
- Integraciones externas nuevas fuera de Sheets `gws`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar specs y docs para `order.lookup` + smoke coverage | Completed | Tool spec nueva + C4/runtime/roadmap/matriz actualizados |
| 2 | Implementar tool `lookup-order` read-only | Completed | `src/tools/order/lookupOrder.ts` con retries y errores controlados |
| 3 | Integrar deteccion/routing en `conversationProcessor` | Completed | Deteccion `order.lookup` y respuesta sin confirm flow |
| 4 | Agregar tests unitarios/runtime | Completed | Tool tests + runtime tests para lookup/report/create order no-regression |
| 5 | Agregar smoke script de reportes y npm script | Completed | `scripts/smoke/report-smoke.ts` + `npm run smoke:report` (mock por default) |
| 6 | Ejecutar validacion y cerrar artefactos | Completed | Tests y smoke ejecutados localmente |

## Validation
- Tests objetivo:
  - `npm test -- src/tools/order/reportOrders.test.ts src/tools/order/lookupOrder.test.ts src/runtime/conversationProcessor.test.ts`
- Smoke objetivo:
  - `npm run smoke:report`

## Outcome
Se agrego la capability `order.lookup` (consulta read-only de pedidos) y se incorporo smoke coverage para escenarios de reportes dia/semana/mes. El runtime ahora separa de forma deterministica: reportes por periodo, lookup de pedido y alta de pedido.
