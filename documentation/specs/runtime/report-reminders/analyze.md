# Report Reminders - Analyze

> **Domain:** `runtime`
> **Feature Slug:** `report-reminders`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Context
El roadmap mantenia `report.reminders` como pendiente pese a tener ya `report.orders`, `schedule.day_view` y `schedule.week_view` operativos. Esta capability cierra el bloque de consultas de planeacion con una vista accionable de urgencia por entrega.

## Risks
1. **Colision de intent routing**: mensajes de recordatorio podian caer en `report.orders` genérico.
2. **Ruido por datos legacy**: filas con fecha invalida podian romper ranking de recordatorios.
3. **Observability gap**: sin `trace_ref`, soporte no puede rastrear errores de proveedor.

## Mitigations
- Deteccion explicita de `report.reminders` con clarificacion de periodo cuando falte.
- Exclusion segura de filas invalidas + publicacion en `inconsistencies[]`.
- Contrato de trazabilidad obligatorio con `Ref/trace_ref` en exito/fallo.

## Validation Strategy
- Unit tool: `src/tools/order/reportReminders.test.ts`.
- Runtime tests: `src/runtime/conversationProcessor.test.ts`.
- Router read-only: `src/skills/readOnlyIntentRouter.test.ts`.
- Smoke dedicado: `scripts/smoke/report-reminders-smoke.ts`.
- Gates: `npm run check:intent-skills`, `npm run test:smoke-integration:summary`, `npm run security:scan`.
