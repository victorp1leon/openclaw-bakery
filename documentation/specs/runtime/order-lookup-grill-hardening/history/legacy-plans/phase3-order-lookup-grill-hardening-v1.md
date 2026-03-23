# Phase 3 - Order Lookup Grill Hardening v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Tool spec | `documentation/specs/contracts/components/lookup-order.spec.md` | Contrato funcional de `order.lookup` |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Politica de mensajes controlados y trazabilidad |
| Skill doc | `skills/order.lookup/SKILL.md` | Contrato operativo de la habilidad |
| Coverage matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura DDD de `order.lookup` |

## Contexto
La salida actual de `order.lookup` no cubre todos los criterios acordados en la ronda `grill-me`: limite por default de 10 configurable por env, prioridad de match exacto por `folio/operation_id`, y trazabilidad visible (`trace_ref`) tanto en exito como en falla. Se requiere hardening puntual sin introducir mutaciones ni confirm flow.

## Alcance
### In Scope
- Ajustar `src/tools/order/lookupOrder.ts` para ranking, limite y `trace_ref`.
- Ajustar runtime (`src/runtime/conversationProcessor.ts`) para respuestas con `Ref` y manejo controlado de errores.
- Agregar/configurar `ORDER_LOOKUP_LIMIT` en `src/config/appConfig.ts` y wiring en `src/index.ts`.
- Actualizar tests unitarios/runtime relacionados.
- Actualizar docs/spec/skill asociados.

### Out of Scope
- Cambios en intents distintos a `order.lookup`.
- Cambios en flujos mutables (`order.create`, `order.update`, `order.cancel`, `payment.record`, `inventory.consume`).
- Nuevas integraciones externas o cambios de proveedor.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Abrir plan y registrar tarea en index | Completed | Plan activo creado |
| 2 | Hardening tool/runtime/config de `order.lookup` | Completed | `trace_ref`, limite default 10, ranking exacto, manejo de query ruidosa |
| 3 | Actualizar tests de tool/runtime/config | Completed | Tests de lookup/runtime/config ajustados al nuevo contrato |
| 4 | Ejecutar validaciones focalizadas | Completed | `npm test -- src/tools/order/lookupOrder.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts` + `npm run check:intent-skills` |
| 5 | Actualizar docs + cerrar plan/handoff | Completed | Specs/skill/docs sincronizados + handoff de sesion |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `order.lookup` como read-only sin confirm flow | Respeta UX actual y contrato de seguridad | 2026-03-17 |
| Exponer `trace_ref` tambien en respuestas exitosas | Mejora soporte operativo y diagnostico sin filtrar detalles internos | 2026-03-17 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/lookupOrder.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts`
  - `npm run check:intent-skills`
- Criterio de aceptacion:
  - `order.lookup` devuelve maximo configurable (default 10), ordenado por exact-id primero + recencia.
  - Respuestas runtime incluyen `Ref` en exito/no-match/falla.
  - Falla del provider en runtime expone mensaje controlado sin detalle crudo.

## Outcome
Se endurecio `order.lookup` segun acuerdos de `grill-me`: limite configurable por env (`ORDER_LOOKUP_LIMIT`, default 10), priorizacion de coincidencia exacta por `folio/operation_id`, `trace_ref` en respuestas exitosas/no-match, y error controlado con `Ref` en fallas. Se actualizaron tests y documentacion de soporte (specs, skill, roadmap, matrix, system-map, config matrix).
