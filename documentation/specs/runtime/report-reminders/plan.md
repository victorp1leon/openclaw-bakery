# Report Reminders - Implementation Plan

> **Domain:** `runtime`
> **Feature Slug:** `report-reminders`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Tool read-only `reportReminders` sobre fuente `report.orders`.
- Routing/runtime para `report.reminders` con prompt de periodo faltante.
- Router OpenClaw read-only extendido con `report.reminders`.
- Cobertura de tests unit/runtime/router.
- Smoke dedicado + registro en summary.
- Cierre documental (specs/coverage/system map/plan/handoff).

### Out of Scope
- Notificaciones push proactivas.
- Mutaciones de pedidos/inventario.
- Ajustes avanzados de umbral por usuario/canal.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Definir contrato canonico (`report-reminders` + runtime/router) | Complete | Specs de componentes actualizadas |
| 2 | Implementar tool `src/tools/order/reportReminders.ts` + tests | Complete | Priorizacion por urgencia y proximidad |
| 3 | Integrar runtime/pending flow + wiring `index.ts` | Complete | Ruta read-only sin confirm flow |
| 4 | Extender router read-only OpenClaw + pruebas | Complete | `readOnlyIntentRouter` incluye `report.reminders` |
| 5 | Agregar smoke dedicado + summary registration | Complete | `smoke:reminders` agregado |
| 6 | Ejecutar validacion final + cierre docs/plan/handoff | Complete | Unit + smoke + security + matrices/docs |

## Validation
- Commands executed:
  - `CI=1 npm test -- --run src/tools/order/reportReminders.test.ts src/skills/readOnlyIntentRouter.test.ts src/runtime/conversationProcessor.test.ts`
  - `SMOKE_CHAT_ID=smoke-reminders-20260324 npm run smoke:reminders`
  - `npm run check:intent-skills`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Results:
  - Tests focales en verde.
  - Smoke dedicado de reminders en verde.
  - Smoke+integration summary en verde.
  - Security scan sin hallazgos de alta confianza.
- Acceptance criteria:
  - `report.reminders` operativo por ruta deterministica y routing read-only OpenClaw.
  - `trace_ref` visible en exito/no-match/fallo controlado.
