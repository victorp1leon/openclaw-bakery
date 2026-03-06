# Phase 4 - Site UI QA MCP Alignment

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Conversion baseline | `site/ideas.md` | Referencia de estructura de landing |
| Site builder | `scripts/web/build-site-from-content.ts` | Generacion del sitio content-driven |
| Config matrix | `documentation/operations/config-matrix.md` | Variables/comandos operativos de smoke |
| Security-first MCP policy | `documentation/ai_collaboration/plans/platform/implementation/ecc-security-first-adoption.md` | Guardrails para adopcion de MCP |

## Contexto
Se identifico la necesidad de iterar layout/tokens con mayor fidelidad visual y validar UX responsive con flujos reales (WhatsApp y personalizados).
El objetivo fue formalizar un flujo operativo compatible con la estrategia actual content-driven y agregar un smoke UI ejecutable localmente.

## Alcance
### In Scope
- Agregar smoke UI con Playwright-core para validar conversion flows en desktop/mobile.
- Documentar workflow operativo de Figma MCP + Playwright MCP.
- Actualizar comandos/scripts y docs operativas de configuracion.
- Registrar trazabilidad en plan/index/handoff.

### Out of Scope
- Integracion live de servidores MCP externos dentro del runtime de produccion.
- Clonado pixel-perfect automatico del sitio de referencia externo.
- Publicacion live del sitio (`WEB_PUBLISH_DRY_RUN=0`).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Disenar smoke UI para `site/dist` con checks de conversion | Completed | Script `scripts/smoke/web-ui-playwright-smoke.ts` |
| 2 | Integrar comando npm y variables operativas | Completed | `smoke:web:ui` + docs config matrix |
| 3 | Documentar flujo MCP (Figma + Playwright) con reglas security-first | Completed | Nuevo doc en operations |
| 4 | Validar comandos locales disponibles y cerrar trazabilidad | Completed | `web:build`, `npm test`, smoke UI en modo fallback |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Implementar smoke UI con `playwright-core` en lugar de framework E2E completo | Menor friccion de adopcion en repo actual y suficiente para checks criticos | 2026-03-04 |
| Mantener modo fallback sin browser (`WEB_UI_SMOKE_SKIP_BROWSER=1`) | Permite validacion minima en entornos sin internet/navegador instalado | 2026-03-04 |
| Documentar MCP como workflow operativo, no como integracion runtime | Preserva aislamiento de seguridad y evita side-effects en produccion | 2026-03-04 |

## Validation
- Comandos:
  - `npm run web:build`
  - `npm test`
  - `WEB_UI_SMOKE_SKIP_BROWSER=1 npm run smoke:web:ui`
- Criterio de aceptacion:
  - Existe comando UI smoke con checks de WhatsApp, personalizados, categorias y mobile overflow.
  - Flujo MCP queda documentado con reglas security-first.
  - Plan/index/handoff actualizados.

## Outcome
- Se agrego smoke UI Playwright-core para validacion de flujos de conversion.
- Se documento workflow de iteracion visual/QA con Figma MCP + Playwright MCP.
- Se extendio la matriz operativa con nuevos comandos y variables de smoke UI.
