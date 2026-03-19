# Phase 3 - Order Delivery Datetime Canonical MX v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-19`
> **Last Updated:** `2026-03-19`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Plan previo (ISO) | `documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-iso.md` | Base tecnica y decisiones previas |
| Runtime parser spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/parser.spec.md` | Contrato de extraccion/normalizacion |
| Conversation processor spec | `documentation/c4/ComponentSpecs/ConversationRuntime/Specs/conversation-processor.spec.md` | Flujo de faltantes, resumen y confirmacion |
| Append order spec | `documentation/c4/ComponentSpecs/Tools/Specs/append-order.spec.md` | Escritura final de pedidos |
| Update order spec | `documentation/c4/ComponentSpecs/Tools/Specs/update-order.spec.md` | Regla equivalente para cambios de entrega |
| Runtime source | `src/runtime/conversationProcessor.ts` | Orquestacion de pedido y order.update |
| Delivery helper source | `src/tools/order/deliveryDateTime.ts` | Canonicalizacion de fecha/hora |

## Contexto
Actualmente `fecha_hora_entrega` puede conservar texto libre (por ejemplo `mañana`) y solo `fecha_hora_entrega_iso` queda normalizado cuando es parseable. Se requiere endurecer el contrato para que `fecha_hora_entrega` sea siempre un datetime valido en timezone `America/Mexico_City`, manteniendo una UX natural (`mañana`, `pasado mañana`, `para el viernes`) pero siempre convertida antes de confirmar/ejecutar.

## Alcance
### In Scope
- Definir contrato canónico: `fecha_hora_entrega` en formato `YYYY-MM-DDTHH:mm:ss` (hora local MX).
- Aceptar expresiones naturales de fecha (`hoy`, `mañana`, `pasado mañana`, `para el viernes`, `este/proximo viernes`) y convertirlas al formato canonico.
- Aplicar normalizacion estricta en `pedido` y `order.update` antes de resumen/confirmacion.
- Si falta hora o no se puede parsear, pedir aclaracion (no permitir texto libre en `fecha_hora_entrega`).
- Permitir conservar contexto ambiguo en `notas` sin contaminar `fecha_hora_entrega`.
- Actualizar pruebas unitarias/runtime para cubrir conversion y faltantes.

### Out of Scope
- Ejecutar migracion live de historicos en Google Sheets.
- Cambios de arquitectura en reportes read-only fuera de consumo del campo canonico.
- Cambios de canal externo (Telegram UX especial) no relacionados con captura de fecha/hora.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Cerrar contrato canónico y reglas de entrada natural | Completed | Aprobado por negocio: `fecha_hora_entrega` siempre datetime válido en `America/Mexico_City` |
| 2 | Actualizar specs runtime/tools (spec-first) | Completed | `parser`, `conversation-processor`, `append-order`, `update-order` actualizados |
| 3 | Implementar normalización estricta en runtime `pedido` | Completed | `fecha_hora_entrega` canónica antes de resumen/confirmación |
| 4 | Implementar normalización estricta en `order.update` | Completed | Patch de entrega canónico o aclaración obligatoria |
| 5 | Ajustar manejo de faltantes y aclaraciones de hora | Completed | Prompt explícito cuando falta hora en fecha relativa |
| 6 | Actualizar pruebas de regresión | Completed | Nuevas pruebas + ajustes de expectativas canónicas |
| 7 | Documentar compatibilidad legacy y estrategia de backfill opcional | Completed | Se mantiene lectura tolerante histórica; sin backfill live en este alcance |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `fecha_hora_entrega` deja de aceptar texto libre y pasa a contrato canonico | Evita ambiguedad operativa en agenda/reportes/estado y simplifica reglas downstream | 2026-03-19 |
| Se mantiene UX de lenguaje natural, pero con conversion obligatoria | Conserva facilidad de uso sin sacrificar consistencia de datos | 2026-03-19 |
| Cuando no hay hora explicita, se solicita hora (no default implícito) | Reduce riesgo operativo de entregas accidentales en `00:00` | 2026-03-19 |
| Contexto no parseable puede preservarse en `notas` | Se conserva señal de negocio sin romper el contrato de fecha | 2026-03-19 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/deliveryDateTime.test.ts src/runtime/conversationProcessor.test.ts src/tools/order/appendOrder.test.ts src/tools/order/updateOrder.test.ts`
  - `npm test -- src/skills/parser.test.ts`
- Criterio de aceptación:
  - Ningun resumen/confirmacion de `pedido` o `order.update` deja `fecha_hora_entrega` en texto libre.
  - Entradas naturales soportadas se convierten a datetime válido en timezone MX.
  - Entradas ambiguas sin hora quedan en flujo de aclaracion.

## Outcome
Implementación completada:
- Se endureció el contrato para que `fecha_hora_entrega` sea canónica (`YYYY-MM-DDTHH:mm:ss`, `America/Mexico_City`) en `pedido` y `order.update`.
- Se amplió la normalización de lenguaje natural de entrega (`hoy`, `mañana`, `pasado mañana`, días de semana) con hora obligatoria.
- Se actualizaron specs C4 relevantes y se agregaron regresiones unitarias/runtime.

Validación ejecutada:
- `npm test -- src/tools/order/deliveryDateTime.test.ts src/runtime/conversationProcessor.test.ts src/tools/order/appendOrder.test.ts src/tools/order/updateOrder.test.ts src/skills/mutationIntentDrafts.test.ts`
- `npm test -- src/skills/parser.test.ts`
