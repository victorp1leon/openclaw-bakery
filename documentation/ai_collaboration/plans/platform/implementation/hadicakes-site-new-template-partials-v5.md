# HadiCakes - Site New Template Partials v5

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico SDD | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Marco de ejecucion |
| Baseline previo | `documentation/ai_collaboration/plans/platform/implementation/hadicakes-site-new-pack2-pack3-v4.md` | Estado anterior de `site-new` |
| Sitio objetivo | `site-new/` | Superficie de trabajo |

## Contexto
Se solicito convertir `header`, `footer` y secciones compartidas en bloques reutilizables tipo template para evitar drift entre paginas de `site-new`.

## Alcance
### In Scope
- Introducir parciales reutilizables para shell compartido.
- Introducir fuentes de pagina con includes.
- Agregar build script para regenerar HTML final.
- Documentar flujo de trabajo de templates.

### Out of Scope
- Migrar `site-new` a framework frontend.
- Cambiar contenido principal de secciones de negocio.
- Integrar SSR o CMS.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear estructura de templates | Completed | `site-new/_templates/{partials,pages}` |
| 2 | Extraer parciales compartidos | Completed | `promo-bar`, `header`, `footer`, `bottom-nav` |
| 3 | Convertir paginas a includes | Completed | 9 paginas en `site-new/_templates/pages/*.html` |
| 4 | Agregar script de build | Completed | `scripts/web/build-site-new-from-templates.js` |
| 5 | Exponer comandos npm + docs | Completed | `web:new:build`, `web:new:live`, README actualizado |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Build-time includes en HTML estatico | Menor complejidad, cero lock-in de framework | 2026-03-25 |
| Mantener output final en `site-new/*.html` | Compatibilidad con flujo actual de preview/publicacion | 2026-03-25 |
| Parciales extraidos desde `index.html` | Garantiza shell canonico consistente en todo el sitio | 2026-03-25 |

## Validation
- `npm run web:new:build`
  - Resultado: build exitoso de 9 paginas.
- `rg -n "@include" site-new/*.html`
  - Resultado: sin tokens de include en output final.
- `rg -n "@include" site-new/_templates/pages/*.html`
  - Resultado: includes presentes en fuentes template.

## Outcome
`site-new` ahora tiene un sistema de templates reutilizables para shell compartido, con build reproducible y comandos operativos simples para regenerar todas las paginas desde parciales.
