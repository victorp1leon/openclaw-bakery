# HadiCakes - Site New Astro Brand Assets Alignment v1

> **Type:** `Implementation`
> **Status:** `Complete`
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
- Definir estrategia de contenido configurable con Google Sheets para:
  - imagenes del sitio,
  - favoritos de home,
  - pasos,
  - catalogo,
  - sugerencias de producto,
  - reseñas.
- Diseñar contrato de datos y flujo de sync Sheets -> `site/CONTENT.json` -> Astro sin editar codigo en cada cambio.

### Out of Scope
- Rediseño estructural completo del sitio.
- Reescritura amplia de copy comercial fuera de bloques de marca.
- Integracion de CMS u origen remoto de assets.
- Cambios backend o runtime del bot.
- Implementacion de panel admin custom en esta fase.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Discovery de branding real y fuentes de verdad | Completed | Confirmados datos de negocio y uso de assets en `site/assets` como baseline temporal |
| 2 | Matriz de reemplazo `site` -> `site-new-astro` | Completed | Logo principal/blanco + tarjeta a `assets/brand`; catalogo real a `assets/catalog` |
| 3 | Normalizar assets en `site-new-astro/public/assets` | Completed | Assets copiados y renombrados: `logo-principal.svg`, `logo-blanco.png`, `logo-color.png`, `tarjeta.jpg` |
| 4 | Aplicar branding en componentes compartidos | Completed | `Header` y `Footer` actualizados con logo real, direccion y redes oficiales |
| 5 | Aplicar branding en pantallas clave | Completed | `Header`/`Footer` + `index`, `catalogo`, `producto-detalle` conectados a contenido sincronizado y assets oficiales |
| 6 | Ajustes SEO/metadata de marca | Completed | Canonical/OG/Twitter de paginas Astro (`index`, `catalogo`, `producto-detalle`, `home`, `home-mobile`, `contacto-cobertura`, `como-ordenar`, `pasteles-personalizados`, `app-shell`) ahora usan `canonical_base_url` configurable |
| 7 | Validacion funcional y visual | Completed | `web:build` + `web:new:build` en verde despues de integrar sync y contenido tipado |
| 8 | Cierre documental y handoff | Completed | plan/index/handoff actualizados con evidencia de validacion y flujo operativo |
| 9 | Definir modelo de contenido tipado | Completed | `site-new-astro/src/lib/site-content.ts` + `site-content.generated.json` como contrato tipado consumible por paginas/componentes |
| 10 | Definir contrato Google Sheets | Completed | Schema v1 en espanol (`scripts/sheets/schemas/web-content.tabs.json`) validado por `sheets:tabs:validate:schema` |
| 11 | Diseñar flujo de sincronizacion | Completed | `web:content:sync` implementado (Sheets/mock -> `site/CONTENT.json` + `site-new-astro/src/data/site-content.generated.json`) |
| 12 | Validacion de operacion sin codigo | Completed | Flujo probado en modo mock (`WEB_CONTENT_SYNC_MOCK_JSON_PATH`) sin editar paginas/componentes |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Priorizar paridad de marca sobre rediseño amplio | Reduce riesgo y acelera salida productiva | 2026-03-26 |
| Usar `site/` como fuente primaria inicial de assets | Aprovecha material validado del negocio en el repo | 2026-03-26 |
| Mantener cambios por fases (global -> paginas) | Facilita QA incremental y rollback puntual | 2026-03-26 |
| Adoptar Google Sheets como fuente de contenido operacional | Permite gestionar catalogo y reseñas sin cambios de codigo | 2026-03-26 |
| Estandarizar contrato de Sheets en espanol | Mantiene consistencia con tabs/headers existentes en operaciones (`CatalogoPrecios`, `Inventario`) | 2026-03-26 |

## Contrato Sheets (v1, espanol)
| Tab | Proposito |
|---|---|
| `productos` | Catalogo principal consumido por home/catalogo/detalle |
| `favoritos_inicio` | Curacion de cards destacadas en home |
| `pasos_compra` | Pasos de la seccion "Como ordenar" |
| `resenas` | Testimonios para home y secciones de confianza |
| `recursos` | Assets de marca y recursos visuales reutilizables |
| `configuracion_sitio` | Metadata/SEO/links/contacto configurables |

## Validation
- Tecnica:
  - `npm run sheets:tabs:validate:schema`
  - `WEB_CONTENT_SYNC_MOCK_JSON_PATH=/tmp/web-content-tabs.mock.json npm run web:content:sync:preview`
  - `WEB_CONTENT_SYNC_MOCK_JSON_PATH=/tmp/web-content-tabs.mock.json npm run web:content:sync`
  - `npm run web:new:build`
  - `npm run web:build`
- Ejecutado:
  - `npm run sheets:tabs:validate:schema` -> OK para `web-content.tabs.json` y schemas existentes.
  - `WEB_CONTENT_SYNC_MOCK_JSON_PATH=/tmp/web-content-tabs.mock.json npm run web:content:sync:preview` -> OK (preview, sin escrituras).
  - `WEB_CONTENT_SYNC_MOCK_JSON_PATH=/tmp/web-content-tabs.mock.json npm run web:content:sync` -> OK (escribe `site/CONTENT.json` + `site-new-astro/src/data/site-content.generated.json`).
  - `npm run web:new:build` -> build Astro OK (9 rutas generadas).
  - `npm run web:build` -> build legacy content-driven OK (`site/dist` generado).
- Aceptacion funcional:
  - Logo oficial visible y consistente en toda la navegacion.
  - Tarjeta/datos de negocio correctos en footer/contacto.
  - Assets visuales de marca aplicados sin romper layout responsive.
  - Enlaces de contacto reales (WhatsApp/redes) vigentes.

## Outcome
Plan cerrado: branding y metadata de paginas clave alineados a contenido sincronizado, contrato Sheets v1 en espanol implementado/validado, y flujo operativo `web:content:sync` habilitado para actualizar `site/CONTENT.json` y el sitio Astro sin cambios manuales de codigo.
