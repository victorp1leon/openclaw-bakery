# Phase 3 - inventory.consume spec-first foundation

> **Type:** `Implementation`
> **Status:** `In Progress`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional fase 3 (`inventory.consume`) |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura y siguiente accion |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Contrato de confirm flow para mutaciones |
| Tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/inventory-consume.spec.md` | Contrato funcional y tecnico de `inventory.consume` |
| System map | `documentation/ai_collaboration/system-map.md` | Trazabilidad del nuevo flujo de evento |

## Contexto
Tras cerrar `shopping.list.generate` y la base de tabs de inventario en Sheets, el siguiente bloque funcional es `inventory.consume`. Esta iteracion inicia con enfoque spec-first para fijar contrato, riesgos y comportamiento esperado antes de tocar runtime/tools.

## Alcance
### In Scope
- Definir spec C4 de `inventory.consume`.
- Alinear contrato de routing/confirmacion en runtime spec.
- Actualizar roadmap, matriz DDD y system map para reflejar estado real.
- Dejar plan activo para siguiente fase de implementacion.

### Out of Scope
- Implementacion de tool/runtime de `inventory.consume`.
- Nuevos tests unitarios/integracion/smoke.
- Ejecucion live sobre Google Sheets.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contrato spec-first (`tool` + `runtime`) | Completed | Incluye reglas, errores deterministicos, idempotencia y confirm flow |
| 2 | Alinear docs transversales (`roadmap`, `DDD`, `system-map`) | Completed | `inventory.consume` pasa de `Planned` a `Partial` por diseno documentado |
| 3 | Implementar tool/runtime | Pending | Siguiente iteracion |
| 4 | Agregar tests y smoke | Pending | Siguiente iteracion |
| 5 | Cerrar plan/handoff en estado `Complete` | Pending | Al terminar implementacion + validaciones |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Tratar `inventory.consume` como mutacion confirmable | Riesgo alto por impacto en stock; requiere confirmacion explicita | 2026-03-13 |
| Usar idempotencia por `operation_id` + verificacion en `MovimientosInventario` | Evita doble descuento por reintentos o mensajes duplicados | 2026-03-13 |
| Marcar estado `Partial` en DDD con diseno listo y sin implementacion | Mantiene trazabilidad honesta del avance real | 2026-03-13 |

## Validation
- Revision cruzada de consistencia documental:
  - `inventory-consume.spec.md` creado
  - `conversation-processor.spec.md` alineado con confirm flow
  - `roadmap`, `DDD matrix` y `system-map` actualizados con el mismo estado (`diseno listo`, `implementacion pendiente`)
- Limitacion actual: no se ejecutaron tests porque esta iteracion solo modifica documentacion de diseno.

## Outcome
Se establecio la base spec-first de `inventory.consume` y la trazabilidad documental para avanzar a implementacion en la siguiente iteracion sin ambiguedad de contrato.
