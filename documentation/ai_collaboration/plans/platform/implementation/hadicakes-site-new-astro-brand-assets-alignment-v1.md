# HadiCakes - Site New Astro Brand Assets Alignment v1

> **Type:** `Implementation`
> **Status:** `In Progress`
> **Created:** `2026-03-26`
> **Last Updated:** `2026-03-26`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico SDD | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Marco de ejecucion |
| System map | `documentation/ai_collaboration/system-map.md` | Contexto transversal |
| Migracion Astro cerrada | `documentation/ai_collaboration/plans/platform/implementation/hadicakes-site-new-astro-migration-v1.md` | Baseline tecnico actual |
| Handoff de cutover | `documentation/ai_collaboration/plans/platform/sessions/session-handoff-2026-03-26-hadicakes-site-new-astro-migration-v1-cutover-close.md` | Estado operativo de salida |

## Contexto
Tras el cutover de `site-new` a `site-new-astro`, se requiere alinear el sitio con la identidad real del negocio HadiCakes: logo oficial, tarjeta de negocio y assets reales de marca. El objetivo es dejar una experiencia visual y comercial consistente con la operacion real.

## Alcance
### In Scope
- Inventariar assets de marca reales disponibles en `site/` y en el repositorio.
- Definir matriz de reemplazo de logo/tarjeta/assets hacia `site-new-astro`.
- Actualizar componentes globales (`Header`, `Footer`) y secciones clave con branding oficial.
- Ajustar metadata visual SEO (iconos/OG imagen principal/canonical real si aplica).
- Validar consistencia visual desktop/mobile en rutas principales.

### Out of Scope
- Rediseño estructural completo del sitio.
- Reescritura amplia de copy comercial fuera de bloques de marca.
- Integracion de CMS u origen remoto de assets.
- Cambios backend o runtime del bot.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Discovery de branding real y fuentes de verdad | Completed | Confirmados datos de negocio y uso de assets en `site/assets` como baseline temporal |
| 2 | Matriz de reemplazo `site` -> `site-new-astro` | Completed | Logo principal/blanco + tarjeta a `assets/brand`; catalogo real a `assets/catalog` |
| 3 | Normalizar assets en `site-new-astro/public/assets` | Completed | Assets copiados y renombrados: `logo-principal.svg`, `logo-blanco.png`, `logo-color.png`, `tarjeta.jpg` |
| 4 | Aplicar branding en componentes compartidos | Completed | `Header` y `Footer` actualizados con logo real, direccion y redes oficiales |
| 5 | Aplicar branding en pantallas clave | In Progress | `catalogo` y `contacto-cobertura` ya alineadas; faltan ajustes en `index` y `producto-detalle` |
| 6 | Ajustes SEO/metadata de marca | In Progress | Structured data y OG de catalogo actualizados; pendiente cierre global de metadata |
| 7 | Validacion funcional y visual | In Progress | Build `web:new:build` en verde; pendiente smoke visual manual de UX |
| 8 | Cierre documental y handoff | Pending | actualizar plan/index + handoff de cierre |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Priorizar paridad de marca sobre rediseño amplio | Reduce riesgo y acelera salida productiva | 2026-03-26 |
| Usar `site/` como fuente primaria inicial de assets | Aprovecha material validado del negocio en el repo | 2026-03-26 |
| Mantener cambios por fases (global -> paginas) | Facilita QA incremental y rollback puntual | 2026-03-26 |

## Validation
- Tecnica:
  - `npm run web:new:build`
  - `npm run web:new:live` (validacion manual en navegador)
- Ejecutado:
  - `npm run web:new:build` -> build Astro OK (9 rutas generadas).
- Aceptacion funcional:
  - Logo oficial visible y consistente en toda la navegacion.
  - Tarjeta/datos de negocio correctos en footer/contacto.
  - Assets visuales de marca aplicados sin romper layout responsive.
  - Enlaces de contacto reales (WhatsApp/redes) vigentes.

## Outcome
Implementacion en curso con branding real ya aplicado en shell global y paginas clave. Siguiente paso: completar ajustes restantes de branding/metadata en `index` y `producto-detalle`, luego cerrar con QA visual y handoff final.
