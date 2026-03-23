# Phase 4 - Web Publish Adapter Implementation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance funcional Fase 4 |
| Tool spec | `documentation/specs/contracts/components/publish-site.spec.md` | Contrato de `web.publish` |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de cobertura |
| Config matrix | `documentation/operations/config-matrix.md` | Variables/env operativas |

## Contexto
`web.publish` quedo con spec v2 definida, pero el adapter sigue en stub.
Se requiere implementar el path real con validaciones de catalogo/imagenes y controles de seguridad para live mode.

## Alcance
### In Scope
- Implementar `createPublishSiteTool` real con timeout/retries y auth gating.
- Validar acciones `crear/menu/publicar` y reglas minimas de contenido.
- Validar seguridad de media URL (`https`, dominios permitidos, reglas Facebook).
- Agregar tests unitarios del adapter.
- Agregar smoke script `web.publish` y wiring en `package.json`.
- Actualizar config/health/docs de operaciones para readiness de `web.publish`.

### Out of Scope
- Integracion runtime completa del intent `web` en `conversationProcessor`.
- Deploy real a Netlify/hosting final (segun decision operativa pendiente).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Implementar adapter `publishSiteTool` | Completed | Incluye mapping, retry y errores sanitizados |
| 2 | Agregar/ajustar tests y smoke script | Completed | Adapter tests + `npm run smoke:web` |
| 3 | Actualizar config/health/docs + cierre | Completed | Matriz config + DDD + handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `dry-run` por defecto | Seguridad por defecto para evitar publicaciones accidentales | 2026-03-04 |
| Implementar con webhook genérico autenticado | Permite avanzar sin bloquear por proveedor final de hosting | 2026-03-04 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/tools/web/publishSite.test.ts src/config/appConfig.test.ts src/health/healthcheck.test.ts` ✅
  - `npm test` ✅
  - `npm run smoke:web` (dry-run) ✅
  - `npm run healthcheck` ✅
- Criterio de aceptacion:
  - `publishSiteTool` ya no retorna stub en live.
  - Fallos de seguridad/config se reportan con errores controlados.
  - Config/health reflejan readiness real de `web.publish`.

## Outcome
- `src/tools/web/publishSite.ts` migrado de stub a adapter real con:
  - validacion de acciones `crear/menu/publicar`
  - validacion/sanitizacion de catalogo y URLs de imagen
  - policy de dominios permitidos + scope Facebook
  - auth gating, timeout/retries y error mapping sanitizado
- Se agrego cobertura de pruebas en `src/tools/web/publishSite.test.ts`.
- Se agrego smoke command `npm run smoke:web` con `scripts/smoke/web-smoke.ts`.
- `AppConfig` y healthcheck ya incluyen readiness de `web_publish_connector`.
- Documentacion operativa y DDD actualizadas para reflejar estado actual.
