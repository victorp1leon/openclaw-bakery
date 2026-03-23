# Phase 4 - Site Static Scaffold (Content-Driven)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance web MVP |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cobertura |
| Config matrix | `documentation/operations/config-matrix.md` | Operacion `web:build` / `web:publish` |
| Content source | `site/CONTENT.json` | Fuente canonica del sitio |

## Contexto
El flujo content-driven ya existe para publicar, pero faltaba materializar el sitio estatico generado desde contenido versionado en repo.
Se requiere scaffold visual MVP y build reproducible para operar por terminal/CI.

## Alcance
### In Scope
- Implementar generador estatico de sitio desde `CONTENT.json` hacia `site/dist`.
- Definir layout MVP (hero, catalogo, menu, cobertura, contacto) responsive.
- Agregar comando `web:build` y ajustar `web:publish` para flujo consistente.
- Actualizar documentación operativa/DDD/roadmap.

### Out of Scope
- Framework frontend completo (Next/Vite/etc).
- Deploy live final (se mantiene flujo existente de `web:publish`).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear script `web:build` con template estatico | Completed | HTML/CSS generado desde JSON |
| 2 | Integrar comandos npm y validar localmente | Completed | `web:build`, `web:publish` |
| 3 | Actualizar docs y cerrar plan/handoff | Completed | Trazabilidad completa |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Generador custom sin framework | Menor complejidad para MVP content-driven | 2026-03-04 |
| Sitio single-page responsive | Rapido de operar y suficiente para vitrina/catalogo | 2026-03-04 |

## Validation
- Tests/comandos:
  - `npm run web:build` ✅
  - `npm run web:publish` (dry-run) ✅
  - `npm test` ✅
- Criterio de aceptacion:
  - `site/dist/index.html` y assets se generan desde `site/CONTENT.json`.
  - Sitio incluye secciones MVP y renderiza catalogo con imagen.
  - Flujo terminal/CI queda documentado.

## Outcome
- Se implemento generador estatico `scripts/web/build-site-from-content.ts`.
- Se agrego comando `npm run web:build`.
- Se actualizo `npm run web:publish` para ejecutar build antes de publicar.
- Se genero scaffold visual responsive en `site/dist`:
  - `index.html`
  - `styles.css`
  - `content.snapshot.json`
- Se actualizo roadmap, matriz DDD y matriz operativa para reflejar modo content-driven con sitio generado.
