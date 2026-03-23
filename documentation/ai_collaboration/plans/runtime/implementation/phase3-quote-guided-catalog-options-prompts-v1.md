# Phase 3 - Quote Guided Prompts With CatalogoOpciones Suggestions (v1)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-12`
> **Last Updated:** `2026-03-12`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Tool spec | `documentation/specs/contracts/components/quote-order.spec.md` | Contrato de salida `quote.order` |
| Quote implementation v1 | `documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-gws-catalog-v1.md` | Base funcional previa |
| Runtime | `src/runtime/conversationProcessor.ts` | Flujo guiado de cotizacion |
| Tool | `src/tools/order/quoteOrder.ts` | Lectura de `CatalogoOpciones` y sugerencias |

## Contexto
El flujo guiado de `quote.order` preguntaba campos faltantes (pan/relleno/betun/topping), pero sin mostrar sugerencias del catalogo. Se requiere que los prompts incluyan opciones sugeridas basadas en `CatalogoOpciones`, filtradas por producto, para mejorar UX y reducir iteraciones.

## Alcance
### In Scope
- Extender resultado de `quote.order` con sugerencias por categoria.
- Reusar esas sugerencias en prompts guiados de `conversationProcessor`.
- Cubrir comportamiento con unit tests y smoke integration summary.

### Out of Scope
- Cambios en calculo de precios.
- Nuevas mutaciones de pedido.
- Cambios de estructura en Google Sheets.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Extender contrato de `quote.order` | Completed | Se agrego `optionSuggestions` opcional por campo guiado. |
| 2 | Derivar sugerencias desde `CatalogoOpciones` | Completed | Clasificacion por categoria/texto + filtro `aplica_a` por producto. |
| 3 | Integrar prompts guiados con sugerencias | Completed | `quotePromptForField` ahora muestra `Opciones:` cuando existen. |
| 4 | Actualizar pruebas | Completed | Tool test + runtime test + smoke quote mock actualizado. |
| 5 | Ejecutar validaciones | Completed | Unit focalizados y smoke+integration summary en PASS. |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Sugerencias como campo opcional en `QuoteOrderResult` | Evita llamada extra a Sheets desde runtime y mantiene flujo determinista | 2026-03-12 |
| Prompt con lista inline (`Opciones: ...`) | Cambio simple, legible en Telegram/WhatsApp, sin alterar estado de confirmacion | 2026-03-12 |

## Validation
- Tests ejecutados:
  - `npm test -- src/tools/order/quoteOrder.test.ts src/runtime/conversationProcessor.test.ts`
  - `npm run test:smoke-integration:summary`
- Criterio de aceptacion:
  - Prompts guiados de cotizacion muestran opciones cuando `CatalogoOpciones` tiene categorias compatibles.
  - Sin regresiones en suites unitarias ni smoke+integration summary.

## Outcome
`quote.order` ahora expone sugerencias por categoria y `conversationProcessor` las muestra en preguntas guiadas de personalizacion. Se validaron cambios con tests unitarios y summary smoke/integration sin fallos.
