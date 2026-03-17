# Phase 3 - order.cancel grill hardening v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Grill interview outcomes | `conversation (2026-03-17)` | Decisiones de negocio para `order.cancel` |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Contrato de flujo/errores en runtime |
| Cancel tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/cancel-order.spec.md` | Reglas de cancelacion y retries |
| Skill doc | `skills/order.cancel/SKILL.md` | Guia operativa actualizada |

## Contexto
Se acordaron nuevas reglas para `order.cancel` con enfoque de seguridad operativa: rechazo por ambiguedad, no-op idempotente explicito, bloqueo de estados terminales y trazabilidad de fallos con referencia. Esta iteracion aterriza esos acuerdos en runtime/tool/spec/tests sin cambiar el enfoque transaccional Trello+Sheets.

## Alcance
### In Scope
- Resolver cancelacion sin referencia explicita mediante lookup por cliente (solo match unico).
- Rechazar ambiguedad de lookup con mensaje claro y pedir `folio|operation_id`.
- Mensaje determinista para no-op idempotente (`ya cancelado`).
- Error controlado con `Ref: order-cancel:<operation_id>` cuando falla ejecucion.
- Bloquear cancelacion en estados terminales (`entregado|completado`).
- Advertencia no bloqueante para entrega cercana.
- Alinear specs y skill docs con el comportamiento implementado.

### Out of Scope
- Cambios de arquitectura en stores de estado/operaciones.
- Nuevos intents de mutacion.
- Smokes live sobre integraciones externas.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar runtime de `order.cancel` | Complete | Lookup por cliente, ambiguedad, no-op explicito, `Ref` en fallo |
| 2 | Endurecer tool `cancelOrder` | Complete | Bloqueo estados terminales + timeout default 30s |
| 3 | Actualizar docs/spec/skill | Complete | Runtime spec + cancel spec + skill `order.cancel` |
| 4 | Actualizar y ejecutar tests | Complete | `conversationProcessor` + `cancelOrder` en verde |
| 5 | Cerrar artefactos de colaboracion | Complete | Plan/index/handoff alineados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Auto-resolver por cliente solo con coincidencia unica | Evita cancelaciones incorrectas por ambiguedad | 2026-03-17 |
| Fallos de `order.cancel` exponen solo `Ref` al usuario | Trazabilidad operativa sin filtrar internals | 2026-03-17 |
| Bloquear estados terminales `entregado|completado` | Evita inconsistencias de negocio post-entrega | 2026-03-17 |

## Validation
- `npx vitest run src/runtime/conversationProcessor.test.ts src/tools/order/cancelOrder.test.ts`
- Criterio de aceptacion:
  - nuevos casos de lookup/ambiguedad/no-op/ref/estado terminal cubiertos
  - specs y skill docs sincronizados con runtime/tool

## Outcome
`order.cancel` quedo endurecido con:
- resolucion automatica por cliente cuando hay match unico,
- rechazo explicito por ambiguedad,
- no-op idempotente con mensaje determinista,
- bloqueo de estados terminales,
- y referencia de soporte en fallos de ejecucion.
