# Phase 4 - Web Netlify Public Publish

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-05`
> **Last Updated:** `2026-03-05`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Objetivo de deploy web publico |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de validacion operacional Fase 4 |
| Config matrix | `documentation/operations/config-matrix.md` | Variables/comandos de publish |
| Webhook local | `scripts/web/local-publish-webhook.ts` | Endpoint `web.publish` que mantiene el flujo |

## Contexto
La validacion local de `web.publish` ya esta cerrada, pero faltaba conectar un proveedor publico final para exponer una URL real del sitio. Se implementara soporte Netlify en el webhook local existente para conservar el mismo flujo operativo (`web:build` + `web:publish`) y el mismo contrato del adapter (`deploy_id`, `deploy_url`).

## Alcance
### In Scope
- Extender webhook local para target opcional Netlify.
- Publicar `site/dist` en Netlify usando Deploy API autenticada.
- Agregar comandos/variables operativas para modo Netlify.
- Documentar configuracion y cierre de sesion.

### Out of Scope
- Redisenar el adapter `src/tools/web/publishSite.ts`.
- Cambiar el flujo conversacional de confirmacion.
- Automatizar provisionamiento del sitio Netlify.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear plan y registrar tracking | Completed | Plan creado para esta iteracion |
| 2 | Implementar deploy Netlify en webhook local | Completed | Deploy API: manifest SHA1 + upload + polling `ready` |
| 3 | Agregar comandos/env + actualizar docs | Completed | `package.json`, `.env`, `config-matrix`, roadmap y DDD matrix |
| 4 | Validar localmente y cerrar plan/handoff | Completed | Tests + build OK; smoke webhook bloqueado por `EPERM` en sandbox |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Reusar webhook local existente para integrar Netlify | Evita romper el flujo actual y mantiene contrato del adapter | 2026-03-05 |
| Usar Netlify Deploy API con manifest SHA1 + archivos requeridos | Elimina dependencia de utilidades externas para generar zip | 2026-03-05 |

## Validation
- Tests/comandos a ejecutar:
  - `npm test -- src/tools/web/publishSite.test.ts src/config/appConfig.test.ts src/health/healthcheck.test.ts`
  - `npm run web:build`
- Resultados:
  - Tests: `30 passed` (web publish + config + healthcheck).
  - Build: `web_build_result` OK sobre `site/CONTENT.json`.
  - Smoke webhook local: no ejecutable en este entorno por `listen EPERM 127.0.0.1:8787`.
  - Validacion live en entorno operativo: publish publico confirmado en `https://subtle-pithivier-ac1828.netlify.app/`.
- Criterio de aceptacion:
  - El webhook responde `deploy_id`/`deploy_url` en modo local y modo Netlify.
  - El flujo `npm run web:publish` se mantiene sin cambios en interfaz operativa.

## Outcome
Se conecto el flujo actual de `web.publish` a Netlify sin cambiar el contrato del adapter:
- `scripts/web/local-publish-webhook.ts` ahora soporta `WEB_LOCAL_PUBLISH_TARGET=netlify`.
- En target Netlify se publica `site/dist` via Deploy API y se responde `deploy_id`/`deploy_url` publicos.
- Se agrego script operativo `npm run web:publish:webhook:netlify`.
- Se documentaron variables y pasos de operacion en `.env` y `documentation/operations/config-matrix.md`.
- Se confirmo deploy publico live en Netlify (`https://subtle-pithivier-ac1828.netlify.app/`).
