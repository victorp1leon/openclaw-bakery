# Phase 4 - Web Local Publish Webhook (Node)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-05`
> **Last Updated:** `2026-03-05`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance Fase 4 |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Pendientes operativos web |
| Config matrix | `documentation/operations/config-matrix.md` | Variables y smoke operativos |
| Publish adapter | `src/tools/web/publishSite.ts` | Contrato webhook consumido por runtime |

## Contexto
La Fase 4 mantiene pendiente la validacion live controlada de `web.publish` por falta de endpoint real configurado. Para desbloquear operacion y pruebas inmediatas, se implementara un webhook local en Node que cumpla el contrato actual, valide API key y ejecute build local del sitio.

## Alcance
### In Scope
- Crear webhook local en Node para `web.publish`.
- Validar auth con API key (header + body).
- Procesar acciones `crear/menu/publicar` y actualizar contenido en disco.
- Ejecutar `web:build` tras cambios y responder metadatos de deploy local.
- Documentar ejecucion local y flujo de smoke.

### Out of Scope
- Publicacion en hosting externo real en esta iteracion.
- Cambios de arquitectura del adapter `publishSiteTool`.
- Integracion con proveedor cloud de deploy.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear plan y activar tracking | Completed | Plan registrado en indice |
| 2 | Implementar webhook local Node | Completed | `scripts/web/local-publish-webhook.ts` |
| 3 | Agregar scripts y docs operativas | Completed | Script npm + `config-matrix` + `.env` local |
| 4 | Ejecutar smoke live local y cerrar plan | Completed | `WEB_PUBLISH_DRY_RUN=0 npm run smoke:web` OK |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Usar servidor Node local (sin dependencias nuevas) | Menor friccion para validacion inmediata | 2026-03-05 |
| Mantener Netlify como opcion publica futura | Alineacion con roadmap y bajo costo operativo | 2026-03-05 |

## Validation
- Tests/comandos a ejecutar:
  - `npm run web:publish:webhook:local` (en una terminal)
  - `WEB_PUBLISH_DRY_RUN=0 npm run smoke:web`
- Criterio de aceptacion:
  - Smoke `web.publish` live responde `ok=true`.
  - `site/CONTENT.json` y `site/dist` se actualizan en flujo local.

## Outcome
Se implemento y valido un endpoint local Node para `web.publish`:
- Auth por API key (header/body), compatibilidad con contrato actual del adapter.
- Actualizacion de `site/CONTENT.json` (cuando se envia `content`) y build local automatizado.
- Comando operativo agregado: `npm run web:publish:webhook:local`.
- Validacion live local completada con smoke:
  - `WEB_PUBLISH_DRY_RUN=0 npm run smoke:web` -> `ok=true`, `deployUrl=local://site/dist/index.html`.
