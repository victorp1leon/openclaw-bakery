# HadiCakes - Site New Stitch Replication v2

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico SDD | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Marco de ejecucion de tarea compleja |
| Instrucciones de implementacion | `documentation/ai_implementation/implementation-instructions.md` | Guardrails spec-first del repositorio |
| Mapa del sistema | `documentation/ai_collaboration/system-map.md` | Contexto transversal del proyecto |
| Replicacion Stitch | `.codex/skills/stitch-site-replication/SKILL.md` | Workflow operativo para clon de disenio |

## Contexto
Se solicito replicar nuevamente el ultimo disenio de Stitch del proyecto `HadiCakes` y reemplazar por completo `site-new/` con esa version mas reciente.
La sesion confirmo proyecto y recencia con `updateTime=2026-03-25T22:50:23.132167Z` (`projects/3099817091410322147`).

## Alcance
### In Scope
- Reemplazo total de `site-new/` con HTML exportado de Stitch mas reciente.
- Localizacion de dependencias remotas de disenio (`aida-public`, Google Fonts, Tailwind CDN) a `site-new/assets/*`.
- Normalizacion de navegacion para eliminar `href="#"` y dejar flujo navegable entre pantallas.
- Validacion de integridad de assets y smoke HTTP local por pagina.

### Out of Scope
- Publicacion live o despliegue.
- Cambios en runtime del bot (`src/**`).
- Ajustes de branding de negocio fuera del disenio exportado.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Confirmar proyecto Stitch y pantallas exportables actuales | Completed | `HadiCakes` identificado por titulo + `updateTime` |
| 2 | Reemplazar `site-new/` con export actual | Completed | 9 HTML (`index/home/home-mobile/catalogo/producto-detalle/pasteles-personalizados/como-ordenar/contacto-cobertura/app-shell`) |
| 3 | Localizar assets remotos a repo | Completed | `32` imagenes, `4` CSS de fuentes, `18` fuentes binarias, `tailwindcss-cdn.js` local |
| 4 | Normalizar navegacion y placeholders | Completed | `href="#"` eliminado en todas las paginas |
| 5 | Validar sitio resultante | Completed | Integridad `assets/*` OK + HTTP `200` en 9 rutas |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener copia `home-mobile.html` y `app-shell.html` ademas de `index/home` | Preservar artefactos de export y evitar perdida de vistas disponibles | 2026-03-25 |
| Localizar fuentes e imagenes en vez de depender de CDN | Robustez operativa y replicabilidad local del disenio | 2026-03-25 |
| Mapear `href="#"` segun intencion semantica de cada enlace | Sitio navegable real sin alterar layout visual | 2026-03-25 |

## Validation
- `rg -n "https://lh3.googleusercontent.com/aida-public|https://fonts.googleapis.com|https://fonts.gstatic.com|cdn.tailwindcss.com" site-new/*.html site-new/assets/vendor/*.css`
  - Resultado: sin coincidencias.
- `rg -n "href=\"#\"" site-new/*.html`
  - Resultado: sin coincidencias.
- Verificacion de referencias locales `assets/*` en HTML/CSS
  - Resultado: `missing=0`.
- Smoke HTTP local (fuera de sandbox por restriccion de bind)
  - Resultado: `200` en 9 rutas (`index/home/home-mobile/catalogo/producto-detalle/pasteles-personalizados/como-ordenar/contacto-cobertura/app-shell`).

## Outcome
`site-new/` quedo reemplazado por la version mas reciente de Stitch para `HadiCakes`, con diseno fiel, navegacion funcional y dependencias visuales localizadas en el repo.
