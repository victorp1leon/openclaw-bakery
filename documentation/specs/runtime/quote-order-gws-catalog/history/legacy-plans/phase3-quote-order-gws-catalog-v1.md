# Phase 3 - Quote Order via GWS Catalog v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-12`
> **Last Updated:** `2026-03-12`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Backlog funcional `quote.order` |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Seguimiento de cobertura |
| Pricing bootstrap spec | `documentation/c4/ComponentSpecs/Tools/Specs/pricing-catalog-bootstrap.spec.md` | Estructura de catalogos en Sheets |
| Pricing hardening plan | `documentation/ai_collaboration/plans/runtime/implementation/phase3-pricing-catalog-tab-hardening.md` | Estado de calidad de pestañas de catalogo |

## Contexto
Ya existe catalogo operativo en Google Sheets (`CatalogoPrecios`, `CatalogoOpciones`, `CatalogoReferencias`), pero falta consumirlo desde runtime para responder cotizaciones (`quote.order`) sin mutacion externa.

## Alcance
### In Scope
- Crear tool read-only `quote.order` sobre `gws`.
- Integrar deteccion fallback y respuesta en `conversationProcessor`.
- Wiring en `index.ts`.
- Cobertura de tests para tool y runtime.
- Actualizar docs C4/DDD/plan index + handoff.

### Out of Scope
- Confirm flow para convertir cotizacion en `order.create`.
- Cambios de arquitectura de persistencia.
- Automatizacion de escritura de catalogo desde runtime.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contrato `quote.order` (spec C4) | Completed | `documentation/c4/ComponentSpecs/Tools/Specs/quote-order.spec.md` |
| 2 | Implementar tool `src/tools/order/quoteOrder.ts` | Completed | Lectura `CatalogoPrecios/Opciones/Referencias` + calculo base/extras/envio/urgencia/politicas |
| 3 | Integrar runtime fallback + formatter | Completed | Deteccion deterministica de frases de cotizacion + respuesta inmediata sin confirm flow |
| 4 | Wiring en bootstrap | Completed | `src/index.ts` conectado con configuracion `ORDER_SHEETS_GWS_*` |
| 5 | Tests tool + runtime | Completed | `quoteOrder.test.ts` + nuevos casos en `conversationProcessor.test.ts` |
| 6 | Cierre documental (DDD/index/handoff) | Completed | Matriz DDD + index + handoff actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `quote.order` se atiende por fallback deterministico | Evita depender de clasificacion intent para frases de cotizacion | 2026-03-12 |
| Tool read-only en v1 | Minimiza riesgo operativo y evita confirm flow innecesario | 2026-03-12 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/order/quoteOrder.test.ts src/runtime/conversationProcessor.test.ts`
- Criterio de aceptacion:
  - Runtime responde cotizacion para frases tipo `cotiza ...`.
  - Tool calcula base/extras/envio/politicas desde catalogo activo.
  - Sin mutaciones externas en `quote.order`.

## Outcome
Se implemento `quote.order` end-to-end en modo read-only sobre `gws`, consumiendo `CatalogoPrecios`, `CatalogoOpciones` y `CatalogoReferencias`. El runtime ahora responde cotizaciones por fallback deterministico (sin confirmacion ni mutaciones), con breakdown de conceptos, total estimado, anticipo sugerido y vigencia cuando existen politicas activas en catalogo.
