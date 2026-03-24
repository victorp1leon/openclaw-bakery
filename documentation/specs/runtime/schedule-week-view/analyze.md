# Schedule Week View - Analyze

> **Domain:** `runtime`
> **Feature Slug:** `schedule-week-view`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Context
`schedule.day_view` ya entrega agenda diaria operativa con inconsistencias visibles. El roadmap mantiene pendiente `schedule.week_view` para planeacion semanal y recordatorios.

## Risks
1. **Regresion de routing**: frases semanales pueden colisionar con detector diario.
2. **Data quality drift**: inconsistencias diarias pueden perderse al consolidar semana.
3. **Observability gap**: respuestas semanales sin `trace_ref` dificultan soporte.

## Mitigations
- Detector semanal explicito + exclusion de ruta diaria cuando hay contexto semanal.
- Propagacion obligatoria de `inconsistencies[]` con `dateKey` en consolidado.
- `trace_ref` obligatorio en exito/no-match/fallo controlado.

## Validation Strategy
- Unit tool: `src/tools/order/scheduleWeekView.test.ts`.
- Runtime tests: `src/runtime/conversationProcessor.test.ts`.
- Router read-only: `src/skills/readOnlyIntentRouter.test.ts`.
- Smoke dedicated: `scripts/smoke/schedule-week-view-smoke.ts`.
- Gates: `npm run check:intent-skills`, `npm run test:smoke-integration:summary`, `npm run security:scan`.
