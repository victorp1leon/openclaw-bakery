# Phase 3 - Schedule Week View Spec-Driven v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap producto | `documentation/bot-bakery.roadmap.md` | Backlog y cobertura funcional de `schedule.week_view` |
| Matriz DDD | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado diseno/tests/implementacion |
| Flujo canonico | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Secuencia Discover->Close |
| System map | `documentation/ai_collaboration/system-map.md` | Flujo runtime transversal |
| Feature package | `documentation/specs/runtime/schedule-week-view/` | Artefactos spec-first de la capacidad |

## Contexto
`schedule.day_view` ya estaba entregado en Fase 3, pero `schedule.week_view` seguia en estado `Planned` en roadmap/matriz. Se requiere cerrar la capacidad semanal read-only para planeacion operativa sin mutaciones.

## Alcance
### In Scope
- Tool `scheduleWeekView` con agregacion semanal lunes-domingo sobre `schedule.day_view`.
- Routing/runtime para `schedule.week_view` con aclaracion de faltante semanal (`schedule_week_query`).
- Integracion con router read-only OpenClaw (`schedule.week_view` + campo `week`).
- Tests unit/runtime/router.
- Smoke dedicado y registro en summary.
- Cierre documental (specs/coverage/system map/plan/handoff).

### Out of Scope
- `report.reminders`.
- Alertas proactivas/semaforos de carga semanales.
- Mutaciones de pedidos/inventario.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contratos canonicos (`schedule-week-view`, runtime/router) | Complete | Specs de componentes actualizadas |
| 2 | Implementar tool semanal + tests unitarios | Complete | `src/tools/order/scheduleWeekView.ts` |
| 3 | Integrar runtime + pending flow + wiring `index.ts` | Complete | Ruta read-only sin confirm flow |
| 4 | Extender router read-only OpenClaw + pruebas | Complete | `readOnlyIntentRouter` incluye `schedule.week_view` |
| 5 | Agregar smoke `schedule-week-view` + summary registration | Complete | `smoke:schedule-week` incluido |
| 6 | Ejecutar validaciones y cerrar artefactos | Complete | Unit + smoke + security + docs/plan/handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Reusar `schedule.day_view` como dependencia del weekly tool | Mantiene una sola logica de filtrado e inconsistencias | 2026-03-24 |
| Permitir fecha ancla explicita en parsing semanal | Reduce ambiguedad para planeacion de semanas futuras/pasadas | 2026-03-24 |
| Registrar `schedule.week_view` como intent/skill dedicado | Mantiene paridad con gate `check:intent-skills` | 2026-03-24 |

## Validation
- Commands executed:
  - `CI=1 npm test -- --run src/runtime/conversationProcessor.test.ts src/tools/order/scheduleWeekView.test.ts src/skills/readOnlyIntentRouter.test.ts`
  - `SMOKE_CHAT_ID=smoke-schedule-week-20260324 npm run smoke:schedule-week`
  - `npm run check:intent-skills`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Results:
  - Suite focal en verde (`105/105`).
  - Smoke dedicado semanal en verde.
  - Smoke+integration summary en verde (`87/87`).
  - Security scan sin hallazgos de alta confianza.

## Outcome
`schedule.week_view` queda entregado como capability read-only integrada en tool/runtime/router, con pruebas/smoke y trazabilidad documental completa.

## Next Steps
1. Definir/entregar `report.reminders` para cerrar bloque de scheduling de Fase 3.
2. Evaluar `v1.1` de agenda semanal con semaforos de carga por dia (opcional).
