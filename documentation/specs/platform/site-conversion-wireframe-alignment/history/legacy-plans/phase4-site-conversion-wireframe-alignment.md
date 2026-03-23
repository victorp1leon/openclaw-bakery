# Phase 4 - Site Conversion Wireframe Alignment

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Wireframe ideas | `site/ideas.md` | Baseline de conversion UX |
| Generador sitio | `scripts/web/build-site-from-content.ts` | Implementacion del layout/CTA |
| Contenido sitio | `site/CONTENT.json` | Datos de secciones y copy |

## Contexto
Se definio alinear el sitio con un wireframe de conversion para negocio local de reposteria:
hero fuerte, catalogo accionable, flujo de orden simple, prueba social y contacto directo.

## Alcance
### In Scope
- Agregar `promo bar` con mensaje operativo.
- Agregar seccion de `pasteles personalizados`.
- Agregar CTA por producto con WhatsApp prellenado.
- Agregar barra de categorias en catalogo.
- Agregar boton flotante (sticky) de WhatsApp.

### Out of Scope
- Migracion a framework frontend (Angular/Next/Vite).
- Checkout/pagos online.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Extender modelo de contenido (promo/custom order) | Completed | `CONTENT.json` actualizado |
| 2 | Reordenar y enriquecer secciones de landing | Completed | Orden de conversion aplicado |
| 3 | Incorporar CTA de WhatsApp por producto y sticky | Completed | Links con texto prellenado |
| 4 | Validar build y test suite | Completed | `web:build` + `npm test` |

## Validation
- `npm run web:build` ✅
- `npm test` ✅

## Outcome
- Sitio alineado a wireframe de conversion.
- Secciones clave implementadas: promo, catalogo por categorias, personalizados, como ordenar, galeria, testimonios, contacto.
