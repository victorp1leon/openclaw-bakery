# Phase 4 - Site Branding + Facebook Import Utility

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance de Fase 4 web |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cobertura |
| Config matrix | `documentation/operations/config-matrix.md` | Operacion segura del flujo web |
| Sitio canonico | `site/CONTENT.json` | Fuente de contenido del sitio |

## Contexto
El sitio MVP ya se genera desde `CONTENT.json`, pero faltaba alinear branding del negocio y habilitar una forma operativa para traer URLs de imagenes publicas del Facebook comercial.
El objetivo fue resolverlo con enfoque security-first y fallback manual.

## Alcance
### In Scope
- Actualizar branding base (`Hadi Cakes`) y campos de activos de marca.
- Extender el scaffold para logo y tarjeta de presentacion.
- Agregar utilidad de importacion de imagenes publicas desde Facebook hacia `CONTENT.json`.
- Documentar comandos y limites operativos del importador.

### Out of Scope
- Automatizar scraping robusto contra cambios de HTML/anti-bot de terceros.
- Publicacion live final del sitio en hosting externo.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Ajustar `CONTENT.json` con branding y metadatos de marca | Completed | Nombre oficial + `facebookPageUrl` + `brandAssets` |
| 2 | Extender render del sitio para mostrar logo/tarjeta | Completed | Builder actualizado sin romper modo content-driven |
| 3 | Implementar importador Facebook con restricciones | Completed | Solo `https` + dominios permitidos + sanitizacion |
| 4 | Actualizar docs operativas y validar build | Completed | `web:import:facebook` documentado + `web:build` |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Importador best-effort via HTML publico | Menor complejidad MVP y sin depender de Graph API en esta fase | 2026-03-04 |
| Mantener fallback manual como ruta oficial | Facebook puede bloquear scraping o cambiar markup sin aviso | 2026-03-04 |
| No sobreescribir catalogo manual por defecto | Evitar regresion de curacion manual de imagenes | 2026-03-04 |

## Validation
- Comandos:
  - `npm run web:build`
  - `npm run test`
- Criterio de aceptacion:
  - Build sigue generando `site/dist/*`.
  - Sitio refleja branding `Hadi Cakes`.
  - Existe comando `web:import:facebook` con salida estructurada y dry-run.

## Outcome
- Branding base actualizado a `Hadi Cakes`.
- Soporte de `logo` y `tarjeta de presentacion` disponible en el sitio estatico.
- Utilidad `scripts/web/import-facebook-images.ts` agregada con comando npm.
- Matriz de configuracion actualizada con guia operativa del importador.
