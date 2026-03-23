# Phase 3 - Order Report Grill Hardening v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Tool spec | `documentation/specs/contracts/components/report-orders.spec.md` | Contrato de `report.orders` |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Routing/read-only + mensajes controlados |
| Skill doc | `skills/order.report/SKILL.md` | Contrato operativo de la habilidad |
| Coverage matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado DDD y evidencia |

## Contexto
La ronda `grill-me` de `order.report` cerró decisiones para endurecer exactitud, trazabilidad y operabilidad: orden por recencia, `Ref` visible en éxito/no-encontrado/falla, manejo explícito de inconsistencias de fecha, y clarificación guiada cuando falta periodo. También se acordó limitar salida por configuración (`ORDER_REPORT_LIMIT`, default 10).

## Alcance
### In Scope
- Hardening en `src/tools/order/reportOrders.ts` (trace, inconsistencias, sorting, limit y mapeo robusto de columnas).
- Hardening runtime en `src/runtime/conversationProcessor.ts` (formato detallado, `Ref`, fail controlado, aclaración de periodo).
- Config/wiring de `ORDER_REPORT_LIMIT`.
- Tests unitarios/runtime/config y smoke mock typings.
- Actualización de specs/skill/docs + plan/handoff.

### Out of Scope
- Nuevos filtros no acordados (ej. paginación avanzada o filtros por cliente/producto en report).
- Cambios en intents mutables o en connectors externos.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Abrir plan e index activo | Completed | Plan creado |
| 2 | Actualizar specs y contratos docs | Completed | `report-orders` + runtime + skill + system map + roadmap + config matrix |
| 3 | Implementar tool/runtime/config | Completed | `ORDER_REPORT_LIMIT`, `trace_ref`, inconsistencias, sorting y mapeo robusto |
| 4 | Actualizar tests y ejecutar validación | Completed | Unit/runtime/config + intent-skill gate en verde |
| 5 | Cerrar plan/index + handoff de sesión | Completed | Artefactos sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `ORDER_REPORT_LIMIT` separado de `ORDER_LOOKUP_LIMIT` | Evita coupling accidental entre capacidades diferentes | 2026-03-17 |
| `total` cuenta solo válidos para el periodo | Claridad operativa; inconsistencias se reportan aparte | 2026-03-17 |
| `Ref` visible en éxito/no-encontrado/falla | Soporte y diagnóstico consistente con estándares read-only | 2026-03-17 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/reportOrders.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts`
  - `npm run check:intent-skills`
- Criterio de aceptación:
  - Reporte ordenado por más reciente y acotado por `ORDER_REPORT_LIMIT` (default 10).
  - `Ref` presente en éxito/no-encontrado/falla.
  - Inconsistencias visibles con conteo + ejemplos.
  - Ambigüedad sin periodo pide aclaración explícita.

## Outcome
Se completo el hardening de `order.report` segun acuerdos `grill-me`: orden por recencia, limite configurable por `ORDER_REPORT_LIMIT` (default 10), `trace_ref` visible en exito/no-encontrado/falla, manejo explicito de inconsistencias de fecha con ejemplos, y flujo de clarificacion cuando falta periodo. Se actualizo wiring/config, tests focalizados y docs/spec/skill relacionados; adicionalmente se valido cobertura de skills (`check:intent-skills`) para prevenir omisiones operativas.
