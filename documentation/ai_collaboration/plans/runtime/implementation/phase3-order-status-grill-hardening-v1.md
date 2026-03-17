# Phase 3 - Order Status Grill Hardening v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/order-status.spec.md` | Contrato de `order.status` |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Routing/read-only + mensajes controlados |
| Skill doc | `skills/order.status/SKILL.md` | Contrato operativo de la habilidad |
| Coverage matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado DDD y evidencia |

## Contexto
La ronda `grill-me` de `order.status` definio hardening para trazabilidad, precision de lookup y UX conversacional: `Ref` visible en exito/no-encontrado/falla, clarificacion cuando falta referencia, listado limitado con sugerencia de refinar, ranking por match exacto `folio/operation_id` antes de recencia, y precedencia de cancelacion sobre fecha para estado operativo.

## Alcance
### In Scope
- Hardening en `src/tools/order/orderStatus.ts` (`trace_ref`, ranking, total pre-truncado, limit configurable).
- Hardening en `src/runtime/conversationProcessor.ts` (fallback/pending para query faltante, formato `Ref`, falla controlada).
- Config/wiring de `ORDER_STATUS_LIMIT`.
- Tests unitarios/runtime/config + smoke mock typing.
- Actualizacion de specs/skill/docs + plan/handoff.

### Out of Scope
- Cambios en intents mutables.
- Nuevos filtros avanzados para `order.status` fuera de ranking/limit ya acordados.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Abrir plan e index activo | Completed | Plan creado |
| 2 | Endurecer tool/runtime/config | Completed | `trace_ref`, ranking exacto+recencia, clarificacion faltantes, `ORDER_STATUS_LIMIT` |
| 3 | Actualizar tests y validar | Completed | Unit/runtime/config + intent-skill gate en verde |
| 4 | Actualizar docs/spec/skill | Completed | Contratos y matriz sincronizados |
| 5 | Cerrar plan/index + handoff | Completed | Artefactos sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `Ref` visible en exito/no-match/falla | Soporte operativo consistente en intents read-only | 2026-03-17 |
| Ranking exact-id primero, luego recencia | Reduce ambiguedad sin perder utilidad en consultas por nombre/producto | 2026-03-17 |
| Query faltante pide aclaracion explicita | Evita inferencias inseguras y mantiene control conversacional | 2026-03-17 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/orderStatus.test.ts src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts`
  - `npm run check:intent-skills`
- Criterio de aceptacion:
  - `Ref` visible en exito/no-match/falla de `order.status`.
  - Query ambigua sin referencia pide `order_status_query`.
  - Ranking prioriza exact-id (`folio/operation_id`) y luego recencia.
  - `total` refleja coincidencias completas y `orders[]` respeta limite configurable.

## Outcome
Se completo el hardening de `order.status` segun acuerdos de `grill-me`: `Ref` visible en exito/no-encontrado/falla, aclaracion cuando falta referencia, ranking por exact-id antes de recencia, limite configurable (`ORDER_STATUS_LIMIT`, default 10) y `total` antes de truncado. Se actualizaron tool/runtime/config/tests/docs y se validaron pruebas focalizadas + cobertura intent-skill.
