# Phase 3 - payment.record grill closure v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-18`
> **Last Updated:** `2026-03-18`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| record-payment tool spec | `documentation/specs/contracts/components/record-payment.spec.md` | Contrato tecnico de mutacion |
| conversation processor spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Reglas de flujo conversacional |
| payment.record skill doc | `skills/payment.record/SKILL.md` | Contrato operativo de skill |
| cancel-order spec | `documentation/specs/contracts/components/cancel-order.spec.md` | Fuente de verdad para `estado_pedido=cancelado` |

## Contexto
El cierre de `grill-me` para `payment.record` definio mejoras para live: lookup cuando falta referencia, desambiguacion con opciones, bloqueo por cancelacion basado solo en `estado_pedido=cancelado`, mensaje no-op explicito e higiene de `payment.notas`. Para aplicar el cambio de fuente de verdad se requiere migrar legacy con pedidos cancelados que aun no tengan `estado_pedido`.

## Alcance
### In Scope
- Runtime `payment.record`: lookup + desambiguacion + no-op explicito.
- Tool `recordPayment`: bloqueo solo por `estado_pedido=cancelado` y sanitizacion/limite de `payment.notas`.
- Script de migracion legacy con modo seguro `preview` y `apply` explicito.
- Actualizacion de specs/skill docs y pruebas focalizadas.

### Out of Scope
- Cambios de arquitectura o proveedor fuera de `gws`.
- Ejecucion live/apply de la migracion en esta sesion.
- Cambios funcionales en intents no relacionados.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar specs/docs con decisiones de grill | Complete | Contrato runtime + tool + skill actualizado |
| 2 | Implementar runtime/tool + script migracion | Complete | Lookup, no-op, status-only cancel gate + script backfill preview/apply |
| 3 | Ajustar/agregar tests y smoke relevantes | Complete | Runtime + tool + mutation drafts + smoke summary |
| 4 | Validar y cerrar artefactos plan/handoff | Complete | unit + intent-skill + smoke summary + security en verde |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `payment.record` usa lookup cuando falta referencia | Paridad UX con mutaciones recientes y menor friccion operativa | 2026-03-18 |
| Bloqueo de cancelacion solo por `estado_pedido=cancelado` | Fuente de verdad unica y consistente entre intents mutables | 2026-03-18 |
| Migracion legacy previa para cancelados sin `estado_pedido` | Evitar falsos permitidos al activar regla nueva | 2026-03-18 |
| `payment.notas` con sanitizacion y limite 160 | Reducir ruido/inyeccion de formato en auditoria | 2026-03-18 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/skills/mutationIntentDrafts.test.ts src/tools/order/recordPayment.test.ts src/runtime/conversationProcessor.test.ts`
  - `npm run check:intent-skills`
  - `SMOKE_CHAT_ID=smoke-payment-record-grill-$(date +%s) npm run test:smoke-integration:summary`
  - `npm run security:scan`
- Resultado:
  - `npm test -- ...` -> PASS (`97 passed`)
  - `npm run check:intent-skills` -> PASS
  - `npm run test:smoke-integration:summary` -> PASS (`Total: 70, Passed: 70, Failed: 0`)
  - `npm run security:scan` -> PASS
- Criterio de aceptacion:
  - `payment.record` resuelve referencia faltante por lookup y desambiguacion en chat.
  - Pedidos cancelados se bloquean por `estado_pedido=cancelado` (status source-of-truth).
  - Reintentos idempotentes reportan no-op explicito.
  - `payment.notas` queda normalizada y acotada en evento `[PAGO]`.

## Outcome
Se cerró el hardening de `payment.record` definido en grill:
- Runtime con lookup por texto cuando falta referencia y respuesta de desambiguacion con hasta 5 opciones.
- Ejecucion con mensaje no-op explicito cuando el pago ya estaba registrado para la misma operacion.
- Tool `recordPayment` usa `estado_pedido=cancelado` como unico bloqueo de cancelacion y normaliza notas de pago (trim, colapso de saltos, limite 160).
- Script nuevo de migracion legacy (`preview`/`apply`) para backfill de `estado_pedido=cancelado` en filas con marcador historico.
- Specs, skill docs y pruebas focalizadas actualizadas con validacion completa en verde.
