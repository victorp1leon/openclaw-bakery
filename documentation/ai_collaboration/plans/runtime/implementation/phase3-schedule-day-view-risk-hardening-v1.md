# Phase 3 - schedule.day_view risk hardening v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Grill interview outcomes | `conversation (2026-03-17)` | Decisiones de riesgo cerradas antes de cambiar codigo |
| Previous pilot plan | `documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-spec-driven-pilot-v1.md` | Baseline funcional previo |
| Tool spec | `documentation/specs/contracts/components/schedule-day-view.spec.md` | Contrato actualizado de hardening |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Reglas de routing y mensajes controlados |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado y cobertura de capacidad |

## Contexto
Tras el piloto v1 de `schedule.day_view`, se detectaron riesgos operativos en sesión `grill-me`: manejo de datos incompletos, trazabilidad de fallos, y consistencia de compras sugeridas. Esta iteración endurece el intent sin cambiar su naturaleza read-only.

## Alcance
### In Scope
- Alinear spec y runtime con decisiones cerradas de riesgo.
- Endurecer tool `scheduleDayView` con:
  - uso obligatorio de `fecha_hora_entrega_iso`,
  - bloque visible de `inconsistencies`,
  - exclusión parcial (no fail global) ante datos inválidos,
  - modo recetas `gws` + fallback `inline`.
- Ajustar respuesta runtime y fallback controlado con `trace_ref`.
- Extender tests/smoke para nueva semántica.
- Cerrar artefactos de colaboración (plan/index/handoff) con evidencia.

### Out of Scope
- Implementar `schedule.week_view`.
- Implementar `report.reminders`.
- Cambiar políticas globales de otros intents read-only.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar spec y contratos de docs | Complete | Specs de Tool/Runtime + descripcion de componente y cobertura actualizadas |
| 2 | Implementar hardening en tool/runtime | Complete | ISO obligatorio, inconsistencies visibles, `trace_ref` en exito/error, catalogo+fallback |
| 3 | Actualizar tests y smoke | Complete | Tool tests + runtime tests + smoke script con nuevos campos |
| 4 | Ejecutar validación técnica | Complete | Vitest focalizado, smoke schedule, summary smoke/integration y security scan en verde |
| 5 | Cerrar artefactos de colaboración | Complete | Plan, index y handoff alineados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Excluir cancelados completamente de agenda operativa | Evita ruido operativo en plan diario | 2026-03-17 |
| Excluir pedidos sin `fecha_hora_entrega_iso` y reportarlos en `inconsistencies` | Prioriza exactitud de agenda sin tumbar todo el resultado | 2026-03-17 |
| Usar `CatalogoRecetas` con fallback inline por producto no mapeado | Mejora precision progresiva sin bloquear operacion | 2026-03-17 |
| Mantener mensaje de fallo controlado con `trace_ref` | Soporte trazable sin exponer internals | 2026-03-17 |

## Validation
- `npx vitest run src/tools/order/scheduleDayView.test.ts src/runtime/conversationProcessor.test.ts`
- `npm run smoke:schedule`
- `npm run test:smoke-integration:summary`
- `npm run security:scan`

## Outcome
Implementacion de hardening completada para `schedule.day_view` con trazabilidad y manejo seguro de datos incompletos:
- Agenda diaria solo con filas activas que tengan `fecha_hora_entrega_iso` valida.
- Filas problematicas reportadas en `inconsistencies` sin tumbar toda la respuesta.
- `trace_ref` visible en respuestas exitosas y de error para soporte operativo.
- Compras sugeridas con fuente `CatalogoRecetas` (`gws`) y fallback `inline` por producto no mapeado.
- Cobertura de pruebas y smokes alineada con la nueva semantica.
