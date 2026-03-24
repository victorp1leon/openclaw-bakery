# Phase 3 - Report Reminders Spec-Driven v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap producto | `documentation/bot-bakery.roadmap.md` | Cobertura funcional de `report.reminders` |
| Matriz DDD | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado diseno/tests/implementacion |
| Flujo canonico | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Secuencia Discover->Close |
| System map | `documentation/ai_collaboration/system-map.md` | Flujo runtime transversal |
| Feature package | `documentation/specs/runtime/report-reminders/` | Artefactos spec-first de la capacidad |

## Contexto
`report.reminders` permanecia en estado `Planned` pese a contar con base operativa (`report.orders`, agenda diaria/semanal). Se requiere cerrar la capacidad de recordatorios read-only para priorizar entregas cercanas y atrasadas con trazabilidad operativa.

## Alcance
### In Scope
- Tool `reportReminders` con clasificacion `overdue|due_soon|upcoming` y `minutes_to_delivery`.
- Routing/runtime para `report.reminders` con clarificacion de periodo faltante (`order_reminders_period`).
- Integracion con router read-only OpenClaw (`report.reminders` + `period`).
- Tests unit/runtime/router.
- Smoke dedicado y registro en smoke summary.
- Cierre documental (specs/coverage/system map/plan/handoff).

### Out of Scope
- Notificaciones push/proactivas.
- Mutaciones de pedidos/inventario.
- Ajustes dinamicos por canal para `dueSoonMinutes`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contratos canonicos (`report-reminders`, runtime/router) | Complete | Specs de componentes actualizadas |
| 2 | Implementar tool + tests unitarios | Complete | Priorizacion por urgencia + inconsistencias visibles |
| 3 | Integrar runtime + pending flow + wiring `index.ts` | Complete | Read-only sin confirm flow |
| 4 | Extender router read-only OpenClaw + pruebas | Complete | `report.reminders` soportado en clasificacion/extraccion |
| 5 | Agregar smoke `report-reminders` + summary registration | Complete | `smoke:reminders` agregado |
| 6 | Ejecutar validaciones y cerrar artefactos | Complete | Unit + smoke + security + docs/plan/handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Reusar `report.orders` como fuente de lectura para reminders | Evita duplicar acceso/normalizacion de `Pedidos` y mantiene consistencia de filtros periodicos | 2026-03-24 |
| Excluir filas con fecha invalida del ranking y exponerlas en `inconsistencies` | Continuidad operativa sin ocultar problemas de calidad de datos | 2026-03-24 |
| Usar umbral `dueSoonMinutes=120` por defecto | Regla simple para v1, ajustable en iteraciones posteriores | 2026-03-24 |

## Validation
- Commands executed:
  - `CI=1 npm test -- --run src/tools/order/reportReminders.test.ts src/skills/readOnlyIntentRouter.test.ts src/runtime/conversationProcessor.test.ts`
  - `SMOKE_CHAT_ID=smoke-reminders-20260324 npm run smoke:reminders`
  - `npm run check:intent-skills`
  - `npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Results:
  - Suite focal en verde.
  - Smoke dedicado de reminders en verde.
  - Smoke+integration summary en verde.
  - Security scan sin hallazgos de alta confianza.

## Outcome
`report.reminders` queda entregado como capability read-only integrada en tool/runtime/router con cobertura de tests/smoke y trazabilidad documental completa.

## Next Steps
1. Medir calidad de recordatorios en operacion real (ruido por datos legacy y umbral `dueSoonMinutes`).
2. Evaluar `v1.1` con semaforos/agrupacion por franja horaria si negocio lo prioriza.
