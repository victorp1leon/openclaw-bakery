# Phase 3 - Report Orders Flexible Periods v2

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-09`
> **Last Updated:** `2026-03-09`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Cobertura funcional esperada de `report.orders` |
| Tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/report-orders.spec.md` | Contrato del adapter de reportes |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Routing conversacional de consultas |
| Prior implementation | `documentation/ai_collaboration/plans/runtime/implementation/phase3-report-orders-gws-v1.md` | Base v1 (`today/tomorrow/week`) |

## Contexto
El bot ya soporta consultas de pedidos para `hoy`, `mañana` y `esta semana`. Se requiere ampliar detección y filtrado para cubrir periodos de lenguaje natural por dia, semana y mes (incluyendo fechas/meses explicitos), manteniendo la ruta read-only a Google Sheets.

## Alcance
### In Scope
- Extender `report.orders` para filtros por:
  - dia (`hoy`, `mañana`, `el 28 de abril`, `10 de mayo`, etc.)
  - semana (`esta semana`, `la siguiente semana`)
  - mes (`este mes`, `mes siguiente`, `mes de mayo`, `mes de diciembre`)
- Ajustar runtime fallback parser para detectar los nuevos periodos.
- Actualizar specs/documentacion asociada y tests unitarios.

### Out of Scope
- Filtros anuales (`este año`, `año pasado`, etc.).
- Nuevos reportes (`report.reminders`) o cambios de integracion externos.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar specs y docs de alcance | Completed | Tool spec + runtime spec + roadmap/matriz + system-map |
| 2 | Implementar nuevo contrato de periodo en `reportOrders` | Completed | Soporte day/week/month estructurado con compatibilidad legacy |
| 3 | Extender deteccion en `conversationProcessor` | Completed | Parseo de lenguaje natural para dia/semana/mes |
| 4 | Actualizar/crear tests de tool y runtime | Completed | Casos para fecha explicita, siguiente semana y mes por nombre |
| 5 | Validar con test run y cerrar artefactos | Completed | Tests focalizados pasando + index/handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Usar un periodo estructurado (`day/week/month`) en vez de flags string aislados | Permite representar fechas y meses explicitos de forma deterministica | 2026-03-09 |

## Validation
- Tests objetivo:
  - `npm test -- src/tools/order/reportOrders.test.ts src/runtime/conversationProcessor.test.ts`
- Criterio de aceptacion:
  - Consultas dia/semana/mes detectadas y filtradas correctamente.
  - Sin regresion en flujos existentes de reporte v1.

## Outcome
Se implemento `report.orders` v2 con filtros conversacionales por dia/semana/mes, incluyendo fechas explicitas (`28 de abril`), semanas relativas (`siguiente semana`) y meses por nombre (`mes de mayo`), manteniendo el path read-only de Google Sheets.
