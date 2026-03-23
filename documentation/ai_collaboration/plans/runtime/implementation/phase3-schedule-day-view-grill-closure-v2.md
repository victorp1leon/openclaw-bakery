# Phase 3 - Schedule Day View Grill Closure v2

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-19`
> **Last Updated:** `2026-03-19`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Schedule tool spec | `documentation/specs/contracts/components/schedule-day-view.spec.md` | Contrato funcional de agenda diaria |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | UX de respuesta parcial + inconsistencias |
| Plan schedule hardening previo | `documentation/ai_collaboration/plans/runtime/implementation/phase3-schedule-day-view-risk-hardening-v1.md` | Base de reglas v1 |
| Script cancel backfill | `scripts/sheets/backfill-canceled-order-status.ts` | Referencia de patrón preview/apply para Sheets |

## Contexto
En grill de diseño se decidió endurecer `schedule.day_view` con política de cancelación estricta por `estado_pedido=cancelado` (sin fallback por `notas`), mantener fallback de compras (`inline` + `fallback_generic`) y conservar respuesta parcial con inconsistencias visibles.

Además, negocio indicó que el Excel actual contiene pedidos de prueba y desea limpieza operativa antes de depender de lógica estricta en datos live.

## Alcance
### In Scope
- Alinear implementación de `schedule.day_view` con cancelación estricta por `estado_pedido`.
- Ajustar pruebas unitarias para reflejar nueva semántica de cancelación.
- Actualizar spec de `schedule-day-view` con decisión del grill.
- Añadir script operativo de limpieza de pedidos en Sheets con patrón seguro `preview/apply` (sin ejecución live automática).
- Actualizar plan/index/handoff con evidencia de validación.

### Out of Scope
- Ejecutar limpieza live de Sheets en esta sesión.
- Cambios de comportamiento en otros intents (`order.status`, `lookup`, `report`) fuera de `schedule.day_view`.
- Migraciones históricas complejas fuera del tab `Pedidos`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar spec `schedule-day-view` con decisiones del grill | Completed | Spec aclara cancelación estricta por `estado_pedido` y nota operativa de limpieza |
| 2 | Implementar cambio de cancelación en tool `scheduleDayView` | Completed | `isCanceledOrder` ya no usa fallback por `notas` |
| 3 | Ajustar/expandir tests unitarios de `scheduleDayView` | Completed | Caso nuevo: marcador en `notas` sin `estado_pedido` no cancela |
| 4 | Implementar script `sheets:orders:clear` con modo preview/apply | Completed | Nuevo script + comandos npm preview/apply explícito |
| 5 | Ejecutar validación (unit focal + smoke/integration summary) | Completed | Unit, smoke/integration, security e intent-skill coverage en verde |
| 6 | Cerrar artefactos de colaboración (plan/index/handoff) | Completed | Plan/index/handoff alineados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `fecha_hora_entrega_iso` obligatorio | Evita agenda con base en fechas no confiables | 2026-03-19 |
| Timezone fija `America/Mexico_City` | Consistencia operativa diaria | 2026-03-19 |
| Cancelación estricta por `estado_pedido=cancelado` | Reduce ambigüedad de marcadores legacy en `notas` | 2026-03-19 |
| Respuesta parcial + inconsistencias visibles | Continuidad operativa con trazabilidad de data quality | 2026-03-19 |
| Mantener fallback `inline` + `fallback_generic` | Evita respuesta vacía en compras sugeridas | 2026-03-19 |

## Validation
- Ejecutado:
  - `npm test -- src/tools/order/scheduleDayView.test.ts src/runtime/conversationProcessor.test.ts` -> **PASS** (87 tests)
  - `npm run check:intent-skills` -> **PASS**
  - `npm run security:scan` -> **PASS**
  - `npm run test:smoke-integration:summary` -> **PASS** (`Total: 70, Passed: 70, Failed: 0`)
- Criterio de aceptación:
  - Cancelación en `schedule.day_view` depende solo de `estado_pedido`.
  - Pruebas unitarias del tool cubren comportamiento estricto.
  - Script de limpieza de pedidos soporta preview y apply explícito.
  - Gate smoke/integration permanece en verde.

## Outcome
Implementación completada.

- `schedule.day_view` quedó alineado con decisión de grill: cancelación estricta por `estado_pedido=cancelado`.
- Se agregó utilidad operativa segura para limpieza de pedidos en Sheets:
  - preview: `npm run sheets:orders:clear:preview`
  - apply: `ORDER_SHEETS_CLEAR_APPLY=1 npm run sheets:orders:clear`
- No se ejecutó limpieza live en esta sesión (sin operación externa mutativa).
