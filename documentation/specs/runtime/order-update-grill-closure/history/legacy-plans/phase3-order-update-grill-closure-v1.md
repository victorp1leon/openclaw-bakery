# Phase 3 - order.update grill closure v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-18`
> **Last Updated:** `2026-03-18`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| update-order tool spec | `documentation/specs/contracts/components/update-order.spec.md` | Contrato tecnico de mutacion |
| conversation processor spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Reglas de flujo conversacional |
| order.update skill doc | `skills/order.update/SKILL.md` | Contrato operativo de skill |
| grill closure decisions | `documentation/ai_collaboration/plans/runtime/sessions/session-handoff-2026-03-11-phase3-order-update-v1.md` | Baseline previo |

## Contexto
El cierre de `grill-me` para `order.update` definio mejoras de UX/operacion para live: aceptar frases sin referencia explicita, resolver por lookup cuando sea posible, desambiguar con lista acotada y pedir faltante de patch en lugar de parse error duro. El objetivo es aplicar estos ajustes sin romper confirm flow, trazabilidad e idempotencia.

## Alcance
### In Scope
- Ajustes de parser/runtime para aclaracion/desambiguacion de `order.update`.
- Actualizacion de specs/docs de runtime/skill afectadas.
- Pruebas unitarias focalizadas para nuevos caminos.

### Out of Scope
- Cambios en semantica de `updateOrder` tool (dual-write Trello+Sheets).
- Mutaciones live reales o smokes live.
- Cambios en otros intents fuera del comportamiento compartido de aclaracion.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar specs/docs para contrato de aclaracion `order.update` | Completed | Specs/runtime/skill alineados al cierre de grill |
| 2 | Implementar parser/runtime para faltantes + lookup ambiguo | Completed | `order.update` ahora soporta lookup + pending de patch |
| 3 | Agregar/ajustar tests unitarios focalizados | Completed | Nuevos casos en runtime + mutation drafts |
| 4 | Ejecutar validacion y cerrar artefactos | Completed | unit + intent-skills + smoke summary + security scan |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener comentario Trello con patch completo | Prioridad de trazabilidad operativa (decision del grill) | 2026-03-18 |
| Desambiguacion en `order.update` con lista max 5 | Balance entre claridad UX y ruido en chat | 2026-03-18 |
| Reusar mismo `operation_id` durante aclaracion | Mantener idempotencia y continuidad de la operacion | 2026-03-18 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/skills/mutationIntentDrafts.test.ts src/runtime/conversationProcessor.test.ts`
  - `npm run check:intent-skills`
  - `npm run test:smoke-integration:summary`
- Criterio de aceptacion:
  - `order.update` acepta faltantes progresivos (referencia/patch) con confirm flow intacto.
  - Ambiguedad por cliente muestra opciones y solicita `folio|operation_id`.
  - Tests nuevos y existentes en verde para rutas afectadas.

## Outcome
Se cerró el hardening de `order.update` definido en grill:
- Acepta frases sin referencia explicita y resuelve por lookup cuando hay match unico.
- En ambiguedad muestra lista acotada (max 5) y solicita `folio|operation_id`.
- Si falta patch, pide aclaracion (`order_update_patch`) sin romper la operacion pendiente.
- Conserva el mismo `operation_id`/`idempotency_key` durante aclaracion.

Validacion ejecutada:
- `npm test -- src/skills/mutationIntentDrafts.test.ts src/runtime/conversationProcessor.test.ts` ✅
- `npm run check:intent-skills` ✅
- `SMOKE_CHAT_ID=smoke-order-update-grill-$(date +%s) npm run test:smoke-integration:summary` ✅ (70/70)
- `npm run security:scan` ✅
