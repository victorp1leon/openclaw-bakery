# Phase 4 - Web Runtime Integration

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance funcional Fase 4 |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Estado actual `web` |
| Publish spec | `documentation/specs/contracts/components/publish-site.spec.md` | Contrato de `web.publish` |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Flujo de confirmacion/ejecucion |

## Contexto
`web.publish` ya tiene adapter real, tests y smoke, pero el runtime conversacional aun no ejecuta el intent `web`.
Falta completar el wiring para tener flujo end-to-end: parse basico, summary, confirm/cancel y ejecucion del tool.

## Alcance
### In Scope
- Integrar `intent=web` en `conversationProcessor`.
- Agregar parse basico local para `web` (`crear|menu|publicar`) con soporte de contenido JSON inline.
- Agregar validacion de faltantes minima para pedir datos clave antes de confirmar.
- Ejecutar `publishSiteTool` en confirm path.
- Agregar/actualizar tests de runtime para flujo `web`.
- Actualizar matriz DDD y handoff.

### Out of Scope
- Reemplazar parse basico `web` por parser OpenClaw dedicado.
- Integracion live del endpoint de publish (solo dry-run en esta iteracion).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Extender runtime con flujo `web` | Completed | Parse + pending + confirm/cancel |
| 2 | Cubrir con tests de runtime | Completed | casos exito/fallo/campos faltantes |
| 3 | Actualizar DDD + handoff + index | Completed | cierre de trazabilidad |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Parser `web` local heuristico en runtime | Permite avanzar sin bloquear por parser OpenClaw especifico de `web` | 2026-03-04 |
| Pedir faltantes minimos solo para datos criticos | Mantener UX simple y segura en MVP | 2026-03-04 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/runtime/conversationProcessor.test.ts` ✅
  - `npm test` ✅
  - `npm run smoke:web` ✅
  - `npm run healthcheck` ✅
- Criterio de aceptacion:
  - `intent web` deja de responder "no implementado".
  - Existe summary + confirm/cancel + ejecución controlada de `publishSiteTool`.
  - Fallos del tool quedan trazados con estado `failed` y mensaje controlado.

## Outcome
- `conversationProcessor` ahora integra `intent=web` con parse basico, faltantes, summary y confirm/cancel.
- Confirm path ejecuta `publishSiteTool` con status/trace de exito y error controlado.
- Se agregaron pruebas de runtime para flujo web (`src/runtime/conversationProcessor.test.ts`).
- Se conecto `createPublishSiteTool` configurado en `src/index.ts` para usar `WEB_*` en runtime real.
- Documentacion DDD/roadmap/spec runtime actualizada para reflejar estado.
