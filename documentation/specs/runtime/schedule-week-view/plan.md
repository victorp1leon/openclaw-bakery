# Schedule Week View - Implementation Plan

> **Domain:** `runtime`
> **Feature Slug:** `schedule-week-view`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Tool read-only `scheduleWeekView` agregando 7 dias (lunes-domingo).
- Routing/read-only runtime para `schedule.week_view` con prompt de faltante semanal.
- Router OpenClaw read-only extendido con campo `week`.
- Cobertura de tests unit/runtime/router.
- Smoke dedicado + registro en smoke/integration summary.
- Artefactos docs/plan/handoff de cierre.

### Out of Scope
- Recordatorios proactivos (`report.reminders`).
- Notificaciones push o scheduling automatico.
- Mutaciones sobre pedidos/inventario.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Definir contrato de `schedule-week-view` + ajustes runtime/router | Complete | Specs canonicos actualizados |
| 2 | Implementar tool `src/tools/order/scheduleWeekView.ts` | Complete | Reuso de `schedule.day_view` por dia |
| 3 | Integrar runtime (`conversationProcessor`) y wiring (`index.ts`) | Complete | Ruta read-only sin confirm flow |
| 4 | Extender tests (tool/runtime/router) | Complete | Casos happy path + missing scope + fallo controlado |
| 5 | Agregar smoke `schedule-week-view` y registrar summary | Complete | `smoke:schedule-week` agregado |
| 6 | Ejecutar gates de validacion | Complete | Unit + smoke summary + security + skill coverage |

## Validation
- Commands executed:
  - `CI=1 npm test -- --run src/runtime/conversationProcessor.test.ts src/tools/order/scheduleWeekView.test.ts src/skills/readOnlyIntentRouter.test.ts`
  - `SMOKE_CHAT_ID=smoke-schedule-week-20260324 npm run smoke:schedule-week`
  - `npm run check:intent-skills`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Results:
  - Tests focales: `105/105` pass.
  - Smoke semanal dedicado: pass.
  - Smoke+integration summary: `87/87` pass.
  - Security scan: sin hallazgos de alta confianza.
- Acceptance criteria:
  - `schedule.week_view` operativo por ruta deterministica y read-only routing OpenClaw.
  - Respuestas con `trace_ref` en exito/no-match/fallo controlado.
