# Phase 3 - Order Lifecycle Skills Spec-First

> **Type:** `Implementation`
> **Status:** `In Progress`
> **Created:** `2026-03-09`
> **Last Updated:** `2026-03-11`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional de Fase 3 |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado actual y backlog inmediato |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Reglas de routing/confirm flow |
| Order create spec | `documentation/c4/ComponentSpecs/Tools/Specs/append-order.spec.md` | Contrato base de estructura de pedido |
| Lookup spec | `documentation/c4/ComponentSpecs/Tools/Specs/lookup-order.spec.md` | Referencia read-only para consultas |

## Contexto
Ya se cubrio `order.create`, `order.lookup` y reportes por periodo (`day/week/month/year`). El siguiente bloque prioritario del roadmap es ciclo de vida de pedidos (`order.update`, `order.cancel`, `order.status`) y registro de pagos (`payment.record`) bajo enfoque spec-first para minimizar regresiones en runtime conversacional.

## Alcance
### In Scope
- Definir specs C4 para:
  - `order.update`
  - `order.cancel`
  - `order.status`
  - `payment.record`
- Definir reglas de negocio y seguridad en runtime para:
  - confirmacion obligatoria en mutaciones
  - idempotencia y dedupe de operaciones
  - restricciones de estado invalido (ej. cancelar pedido ya entregado)
- Implementar tools/runtime necesarios para lecturas y mutaciones en `Pedidos` (y pagos si aplica hoja dedicada) via provider configurado.
- Agregar cobertura de tests unitarios/runtime y smoke tests dedicados del bloque.
- Actualizar roadmap, matriz DDD, system map y skill docs asociadas.

### Out of Scope
- `quote.order`, `shopping.list.generate`, `inventory.consume`.
- Cambios de arquitectura de almacenamiento fuera de hojas operativas existentes.
- Nuevos canales o cambios de UX de canal fuera del flujo de pedidos.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Aterrizar contratos (`*.spec.md`) de `order.update/cancel/status/payment.record` | Completed | Specs draft creadas en `Tools/Specs/` |
| 2 | Actualizar spec de runtime para routing e intenciones | Completed | `order.status`, `order.update` y `order.cancel` documentados con reglas de confirm flow |
| 3 | Implementar tools + wiring en runtime/skills | In Progress | `order.status` + `order.update` + `order.cancel` implementados con sync Trello+Sheets y rollback |
| 4 | Agregar tests unitarios e integracion de runtime | In Progress | Cobertura para rollback/create/delete card + `order.status` + `order.update` + `order.cancel` |
| 5 | Agregar smoke tests (mock default, live opcional) | In Progress | `smoke:status` + `smoke:update` + `smoke:cancel`; falta smoke lifecycle compuesto y `payment.record` |
| 6 | Cierre documental y handoff de sesion | In Progress | Docs y matriz actualizadas para `order.update/order.cancel`; falta `payment.record` |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Entrar por contrato/spec antes de codigo | Reducir ambiguedad en mutaciones con riesgo operativo alto | 2026-03-09 |
| Mantener smoke mock por default y live opcional | Reproducibilidad local sin depender de credenciales | 2026-03-09 |
| Consistencia dual Trello+Sheets con rollback | Evitar divergencia operativa entre tablero y hoja al mutar pedidos | 2026-03-11 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/orderCardSync.test.ts src/tools/order/updateOrder.test.ts src/tools/order/cancelOrder.test.ts src/runtime/conversationProcessor.test.ts src/health/healthcheck.test.ts`
  - `npm run smoke:update`
  - `npm run smoke:cancel`
- Criterio de aceptacion:
  - Mutaciones solo ejecutan tras `confirmar`.
  - `order.status` responde sin mutacion ni confirm flow.
  - `order.update` genera resumen y ejecuta tras confirmacion con referencia + patch validos.
  - `order.cancel` agrega marker `[CANCELADO]` y retorna no-op deterministico cuando ya estaba cancelado.
  - `order.create`, `order.update` y `order.cancel` mantienen consistencia Trello+Sheets (si falla un lado, rollback del otro).
  - Cambios quedan trazables por `operation_id` y sin duplicados accidentales.

## Outcome
Plan activo para implementar ciclo de vida de pedidos con enfoque spec-first y validacion operacional (tests + smokes), preservando el baseline de seguridad del runtime.
