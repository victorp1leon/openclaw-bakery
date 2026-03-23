# Phase 3 - Quote To Order Create Flow (v1)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-12`
> **Last Updated:** `2026-03-12`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional (`quote -> order.create`) |
| Runtime spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Reglas del orquestador conversacional |
| Quote tool spec | `documentation/c4/ComponentSpecs/Tools/Specs/quote-order.spec.md` | Contrato de cotizacion read-only |
| Plan previo quote v1 | `documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-gws-catalog-v1.md` | Base del flujo de cotizacion actual |

## Contexto
Actualmente `quote.order` genera cotizaciones, pero al finalizar no existe un puente operativo para crear el pedido. El objetivo es permitir que, al aceptar la cotización, el runtime inicie el flujo de `pedido` con datos ya inferidos de la cotización y continúe con preguntas faltantes + confirmación antes de ejecutar conectores.

## Alcance
### In Scope
- Etapa post-cotización para aceptar/rechazar conversión a pedido.
- Construcción de borrador inicial de `pedido` desde resultado de cotización.
- Reuso del flujo existente de missing fields + summary + confirm + ejecución `order.create`.
- Pruebas unitarias y smoke coverage del nuevo comportamiento.

### Out of Scope
- Cambios en cálculo de cotización (`quote.order` pricing).
- Nuevas mutaciones fuera de `order.create`.
- Cambios de arquitectura de persistencia.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contrato runtime para `quote_to_order_confirm` | Completed | Spec runtime actualizada con reglas de conversion quote->pedido |
| 2 | Implementar transición quote -> pedido | Completed | Runtime pasa de quote aceptada a draft de pedido y reusa flujo `pedido` |
| 3 | Validar con tests + smoke | Completed | Unit focalizados + `smoke:quote` + summary smoke/integration |
| 4 | Cierre documental (index + handoff) | Completed | Consistencia plan/index/handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Reusar pipeline de `pedido` existente tras aceptar cotización | Evita duplicar reglas de validación/confirmación/ejecución | 2026-03-12 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/runtime/conversationProcessor.test.ts`
  - `npm run smoke:quote`
  - `npm run test:smoke-integration:summary`
- Criterio de aceptación:
  - Al confirmar cotización, se inicia flujo de pedido con draft parcial.
  - Se piden faltantes hasta resumen de pedido.
  - La ejecución final mantiene confirmación explícita y guardas existentes.

## Outcome
Se implementó el puente `quote -> order.create` en runtime:
- La cotización ahora termina con CTA de conversión (`confirmar/cancelar`).
- Al confirmar, el sistema crea un draft de `pedido` desde la cotización y continúa con `missing.ask_one`.
- Cuando el draft queda completo, conserva el flujo estándar de resumen y confirmación final antes de ejecutar Trello+Sheets.
