# Phase 3 - Quote Read-Only Cancel Guard v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-21`
> **Last Updated:** `2026-03-21`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Read-only routing expansion | `documentation/ai_collaboration/plans/runtime/implementation/openclaw-readonly-routing-expansion-v1.md` | Contexto del enrutado read-only con OpenClaw |
| Quote grill closure | `documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-grill-closure-v1.md` | Contexto de comportamiento esperado de `quote.order` |

## Contexto
Se detectó una regresión en Telegram: al recibir `cancelar` sin operación pendiente, OpenClaw podía clasificar el mensaje como `quote.order` y el runtime iniciaba flujo de cotización pidiendo cantidad. El objetivo fue evitar este falso positivo sin degradar la cotización read-only legítima.

## Alcance
### In Scope
- Ajustar la asignación de `quoteQuery` cuando `routeReadOnlyIntent` retorna `quote.order` sin `query`.
- Agregar prueba de regresión para validar que `cancelar` no dispare cotización.
- Validar con test focalizado y suite completa de `conversationProcessor`.

### Out of Scope
- Cambios al prompt del router read-only.
- Cambios de copy para comandos de control (`confirmar`/`cancelar`) sin operación pendiente.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Identificar ruta exacta del falso positivo | Complete | `quoteQuery = extracted ?? msg.text.trim()` forzaba fallback inseguro |
| 2 | Restringir fallback de `quote.order` | Complete | Se usa `detectQuoteOrderQuery(msg.text)` en lugar de texto crudo |
| 3 | Cubrir con test de regresión | Complete | Caso OpenClaw `quote.order` sin query + mensaje `cancelar` |
| 4 | Ejecutar validación | Complete | 6 tests focalizados + 80 tests de `conversationProcessor` |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| No usar `msg.text.trim()` como fallback para `quote.order` read-only | Previene que controles como `cancelar` disparen el flujo de cotización | 2026-03-21 |
| Mantener fallback deterministico con `detectQuoteOrderQuery` | Preserva casos válidos de cotización cuando hay verbo explícito (`cotiza`, `cotización`, etc.) | 2026-03-21 |

## Validation
- Tests ejecutados:
  - `npx vitest run src/runtime/conversationProcessor.test.ts -t "ignora quote.order read-only sin query cuando el mensaje no trae señales de cotización|usa ruta read-only OpenClaw para order.status cuando el flag está activo|en estricto no cae a fallback read-only cuando OpenClaw responde unknown|en no estricto usa fallback read-only local cuando OpenClaw responde unknown|resuelve quote.order por fallback sin pasar por intent router|pide datos faltantes para quote.order y luego cotiza"`
  - `npx vitest run src/runtime/conversationProcessor.test.ts`
- Criterio de aceptación:
  - `cancelar` sin operación pendiente no debe responder `¿Para cuántas piezas/porciones lo cotizo?`.
  - Flujos válidos de cotización y read-only existentes deben seguir pasando.

## Outcome
Se eliminó el fallback inseguro que convertía texto libre en `quoteQuery` dentro de la rama read-only de `quote.order` y se añadió una regresión para blindar el caso observado en Telegram.
