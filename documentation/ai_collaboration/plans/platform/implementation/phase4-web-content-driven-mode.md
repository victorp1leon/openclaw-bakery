# Phase 4 - Web Content-Driven Mode (Chat Disabled by Default)

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance funcional web |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado de implementación |
| Config matrix | `documentation/operations/config-matrix.md` | Variables operativas |
| Publish spec | `documentation/specs/contracts/components/publish-site.spec.md` | Contrato del adapter |

## Contexto
El objetivo es operar el sitio en modo repositorio+CI/terminal, reduciendo riesgo operativo por comandos de chat.
Se requiere mantener `web.publish` implementado pero deshabilitar por defecto la operación web vía conversación.

## Alcance
### In Scope
- Deshabilitar `intent web` por chat por default mediante feature flag.
- Agregar ruta terminal/CI para publicar desde `CONTENT.json` versionado en repo.
- Extender config/health/docs con modo content-driven.
- Ajustar tests para el nuevo comportamiento.

### Out of Scope
- Eliminación total del flujo `web` conversacional (se mantiene detrás de flag).
- Integración live de proveedor final de hosting.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Agregar flags y wiring runtime para chat web on/off | Completed | `WEB_CHAT_ENABLE` |
| 2 | Crear script de publish desde contenido en repo | Completed | terminal/CI path |
| 3 | Actualizar tests y documentación de operación | Completed | roadmap + config + DDD + handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| `WEB_CHAT_ENABLE=0` por defecto | Seguridad y menor complejidad operacional | 2026-03-04 |
| Mantener flujo chat detrás de flag | Flexibilidad futura sin reimplementar | 2026-03-04 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/runtime/conversationProcessor.test.ts src/config/appConfig.test.ts src/health/healthcheck.test.ts` ✅
  - `npm test` ✅
  - `npm run web:publish` (dry-run) ✅
- Criterio de aceptacion:
  - En runtime real, intent `web` via chat queda deshabilitado por default.
  - Existe flujo CLI/CI para publicar desde archivo contenido versionado.

## Outcome
- Se agrego `WEB_CHAT_ENABLE` (default `0`) y `WEB_CONTENT_PATH` (default `site/CONTENT.json`) en `appConfig`.
- Runtime ahora bloquea intent `web` por chat cuando el flag esta deshabilitado y sugiere `npm run web:publish`.
- Se agrego script content-driven `scripts/web/publish-site-from-content.ts` y comando `npm run web:publish`.
- Se agrego contenido canonico inicial en `site/CONTENT.json`.
- Se actualizaron healthcheck/tests/docs (roadmap, config matrix, DDD, spec runtime).
