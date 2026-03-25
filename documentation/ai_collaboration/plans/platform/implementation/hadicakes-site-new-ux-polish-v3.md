# HadiCakes - Site New UX Polish v3

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico SDD | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Marco de ejecucion |
| Plan base de replicacion | `documentation/ai_collaboration/plans/platform/implementation/hadicakes-site-new-stitch-replication-v2.md` | Baseline del sitio replicado |
| Sitio objetivo | `site-new/` | Superficie modificada |

## Contexto
Tras la replicacion del diseno Stitch en `site-new/`, el usuario solicito "agrega mejoras".
Se ejecuto un polish UX rapido (pack 1 recomendado) sin cambiar direccion visual.

## Alcance
### In Scope
- Convertir CTAs comerciales visuales (botones sin accion) a enlaces funcionales.
- Homologar destino de CTAs clave (`catalogo`, `cotizacion`, `WhatsApp`).
- Mejorar envio del formulario de contacto hacia WhatsApp con mensaje estructurado.
- Agregar atributos de accesibilidad en controles icon-only puntuales.
- Revalidar navegacion/robustez del sitio.

### Out of Scope
- Cambios SEO avanzados (`og:*`, sitemap, schema).
- Refactor de interacciones complejas (menu drawer funcional, filtros dinamicos de catalogo).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Detectar CTAs sin accion y controles muertos | Completed | Barrido de `site-new/*.html` con `rg` |
| 2 | Convertir CTAs a anchors con destino real | Completed | `Pedir/Ordenar por WhatsApp`, `Ver catalogo`, `Cotizar/Solicitar diseno` |
| 3 | Cablear formulario de contacto a WhatsApp | Completed | `contact-whatsapp-form` + `window.open(wa.me...)` con payload de campos |
| 4 | Mejorar accesibilidad minima en icon-only buttons | Completed | `aria-label` + `type="button"` en `menu/chevron/arrow_forward/OK` |
| 5 | Validar salida final | Completed | Sin placeholders, assets ok, HTTP `200` en 9 rutas |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener filtros de catalogo como botones estaticos | Son elementos visuales del export y no hay data-binding en esta iteracion | 2026-03-25 |
| Redirigir CTAs de cotizacion a `pasteles-personalizados.html#cotizacion` | Unifica funnel de conversion en punto existente | 2026-03-25 |
| Enviar formulario de contacto por WhatsApp en cliente | Mejora utilidad inmediata sin backend adicional | 2026-03-25 |

## Validation
- `rg -n "href=\"#\"|https://lh3.googleusercontent.com/aida-public|https://fonts.googleapis.com|https://fonts.gstatic.com|cdn.tailwindcss.com|wa.me/yourphonenumber" site-new/*.html site-new/assets/vendor/*.css`
  - Resultado: sin coincidencias.
- `rg -n "<button[^>]*>\s*Pedir por WhatsApp|<button[^>]*>\s*Ver catalogo|<button[^>]*>\s*Cotizar pastel personalizado|<button[^>]*>\s*Ordenar por WhatsApp|<button[^>]*>\s*Solicitar diseno especial|<button[^>]*>\s*Enviar cotizacion por WhatsApp" site-new/*.html`
  - Resultado: sin coincidencias.
- Verificacion de rutas locales `assets/*`
  - Resultado: `missing=0`.
- Smoke HTTP local
  - Resultado: `200` en `index/home/home-mobile/catalogo/producto-detalle/pasteles-personalizados/como-ordenar/contacto-cobertura/app-shell`.

## Outcome
`site-new/` mantiene el diseno Stitch, pero ahora con CTAs de negocio funcionales, mejor consistencia de navegacion y contacto por WhatsApp utilizable desde el formulario.
