# Phase 2/3 - expense.add + order.create grill hardening v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Grill decisions (expense/order) | `conversation (2026-03-17)` | Cierre de reglas operativas de esta iteracion |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Contrato de mensajes/confirm flow/duplicados |
| Expense tool spec | `documentation/specs/contracts/components/append-expense.spec.md` | Timeout/retries y conectividad |
| Order tools specs | `documentation/specs/contracts/components/create-card.spec.md`, `documentation/specs/contracts/components/append-order.spec.md` | Timeout/retries y contrato de order.create |

## Contexto
Se definieron reglas de endurecimiento para `expense.add` y `order.create` via ronda `grill-me`: rechazo por ambiguedad, confirmacion obligatoria, duplicados deterministas y resiliencia controlada. El codigo ya cubre parte de estas reglas, pero faltan ajustes de defaults operativos (timeout), mensaje explicito de duplicado para pedido y prueba de parseo heuristico en respuestas de faltantes numericos.

## Alcance
### In Scope
- Actualizar specs de runtime/tools para reflejar decisiones de grill.
- Ajustar defaults de timeout para flujos externos de gasto/pedido a 30s.
- Asegurar mensaje explicito de duplicado en `order.create`.
- Endurecer parseo heuristico al capturar faltantes numericos (`monto|cantidad|total`).
- Actualizar y ejecutar tests focalizados.
- Cerrar artefactos de colaboracion (plan/index/handoff).

### Out of Scope
- Cambios de arquitectura de state/idempotency store.
- Nuevos intents fuera de `expense.add` y `order.create`.
- Smokes live con integraciones externas.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Actualizar specs runtime/tools | Complete | Specs de runtime + append-expense/create-card/append-order alineadas |
| 2 | Implementar ajustes en runtime/config | Complete | Mensaje duplicado pedido, parseo numerico heuristico y defaults `30s` |
| 3 | Actualizar pruebas | Complete | `appConfig.test.ts` + `conversationProcessor.test.ts` con nuevos casos |
| 4 | Ejecutar validacion tecnica | Complete | Vitest focalizado en verde |
| 5 | Cerrar artefactos de colaboracion | Complete | Plan/index/handoff sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener respuesta de rollback fallido generica al usuario, con log interno | Evita exponer detalles internos y conserva trazabilidad operativa | 2026-03-17 |
| Timeout por defecto de conectores de gasto/pedido en 30s | Reduce fallos por latencia variable en integraciones externas | 2026-03-17 |
| Duplicado de `order.create` con mensaje explicito por folio | Mejora claridad operativa al registrar pedidos | 2026-03-17 |

## Validation
- `npx vitest run src/config/appConfig.test.ts src/runtime/conversationProcessor.test.ts`
- `npx vitest run src/tools/expense/appendExpense.test.ts src/tools/order/createCard.test.ts src/tools/order/appendOrder.test.ts`
- Criterio de aceptacion:
  - tests en verde para defaults y reglas de duplicado/faltantes
  - specs y runtime consistentes con decisiones `grill-me`

## Outcome
Hardening completado para `expense.add` y `order.create`:
- Duplicado de `order.create` ahora responde de forma explicita con folio (`operation_id`) existente.
- Captura de faltantes numericos ahora acepta texto con numero embebido (`son 380 pesos`).
- Defaults de timeout para conectores de gasto/pedido ajustados a `30000ms` con `maxRetries=2` (3 intentos).
- Specs, skill docs y pruebas alineadas con el acuerdo `grill-me`.
