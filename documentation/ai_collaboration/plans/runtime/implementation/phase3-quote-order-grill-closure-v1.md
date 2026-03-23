# Phase 3 - Quote Order Grill Closure v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-19`
> **Last Updated:** `2026-03-19`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Quote tool spec | `documentation/specs/contracts/components/quote-order.spec.md` | Contrato de cálculo de cotización |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Flujo quote -> pedido y confirmaciones |
| Read-only router spec | `documentation/specs/contracts/components/read-only-intent-router.spec.md` | Ruteo `quote.order` con OpenClaw |
| Plan quote catálogo | `documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-order-gws-catalog-v1.md` | Base de catálogos y tool |
| Plan quote guided prompts | `documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-guided-catalog-options-prompts-v1.md` | Flujo guiado de personalización |
| Plan quote->order | `documentation/ai_collaboration/plans/runtime/implementation/phase3-quote-to-order-create-flow-v1.md` | Conversión a pedido tras confirmación |

## Contexto
Se cerró un grill de diseño para `quote.order` y quedaron 5 decisiones de producto/operación que cambian comportamiento en cálculo y confirmación. El objetivo es llevar esas decisiones a contrato, implementación y pruebas sin romper el flujo actual de cotización guiada.

## Alcance
### In Scope
- Mantener cantidad obligatoria antes de generar cotización.
- Recalcular cotización al confirmar conversión a pedido y pedir reconfirmación si cambió total o líneas relevantes.
- Exigir zona cuando el envío es a domicilio antes de cerrar total.
- Endurecer matching de opciones/extras: auto-aplicar solo con score alto; pedir aclaración en casos grises.
- Agregar `quote_id` ligero y traza en `notas` al convertir cotización a pedido.
- Actualizar specs + tests unitarios/runtime.

### Out of Scope
- Persistencia dedicada de cotizaciones (store/tabla nueva).
- Cambios de canal/UI fuera del runtime textual.
- Migraciones históricas de cotizaciones anteriores.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Registrar decisiones del grill en plan + contratos | Completed | Decisiones cerradas con negocio el 2026-03-19 |
| 2 | Actualizar specs `quote-order` y `conversation-processor` | Completed | Reglas de recálculo, zona obligatoria y `quote_id` reflejadas en specs C4 |
| 3 | Implementar validación de zona obligatoria para envío en flujo quote | Completed | `quote_order_shipping_zone_missing/ambiguous` + prompt guiado en runtime |
| 4 | Implementar recálculo en confirmación `quote -> pedido` con reconfirmación | Completed | Re-cotiza al confirmar, compara snapshot (`total` + líneas) y exige reconfirmación si hay drift |
| 5 | Endurecer matching opciones/extras con umbral y fallback de aclaración | Completed | Auto-apply solo alta confianza; score gris retorna `quote_order_modifier_ambiguous` |
| 6 | Incorporar `quote_id` ligero en payload/`notas` al crear pedido | Completed | `notas`: `Creado desde cotizacion (quote_id: ...)` |
| 7 | Actualizar tests y validación final | Completed | Unit tests focalizados en tool/runtime; check de seguridad y resumen smoke/integration ejecutados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Cantidad se pregunta siempre (no default silencioso) | Evita cotizaciones ambiguas y errores de precio por volumen | 2026-03-19 |
| Recalcular al confirmar y reconfirmar si cambia | Controla drift de precios entre cotización inicial y cierre | 2026-03-19 |
| Envío a domicilio requiere zona | Evita aplicar tarifa mínima incorrecta sin contexto | 2026-03-19 |
| Matching fuzzy solo con score alto; casos grises piden aclaración | Balance entre UX natural y precisión comercial | 2026-03-19 |
| `quote_id` ligero en `notas` (sin storage dedicado) | Trazabilidad suficiente MVP con bajo costo de implementación | 2026-03-19 |

## Validation
- Ejecutado:
  - `npm test -- src/tools/order/quoteOrder.test.ts src/runtime/conversationProcessor.test.ts` -> **PASS** (84 tests)
  - `npm test -- src/skills/readOnlyIntentRouter.test.ts` -> **PASS** (6 tests)
  - `npm run security:scan` -> **PASS**
  - `npm run test:smoke-integration:summary` -> summary generado en `reports/smoke-integration/latest-summary.md` (Total 25, Passed 5, Failed 20)
- Criterio de aceptación:
  - `quote.order` no confirma conversión a pedido con cotización desactualizada sin reconfirmar.
  - No se retorna total definitivo con envío a domicilio sin zona.
  - Se reduce autoaplicación de extras ambiguos.
  - Pedido creado desde cotización incluye `quote_id` en trazabilidad.

## Outcome
Implementación cerrada para los 5 acuerdos del grill:
- Runtime pide zona obligatoria para domicilio y aclaración de extras/opciones ambiguos.
- Confirmación de `quote -> pedido` ahora re-cotiza y reconfirma si hay drift.
- Pedidos nacidos desde cotización conservan traza ligera con `quote_id` en `notas`.
- Specs y tests actualizados en tool + runtime.
