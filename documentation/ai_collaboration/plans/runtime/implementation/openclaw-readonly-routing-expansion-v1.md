# OpenClaw Read-Only Routing Expansion V1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-19`
> **Last Updated:** `2026-03-19`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| System Map | `documentation/ai_collaboration/system-map.md` | Contexto de arquitectura y flujos runtime/tools |
| Spec-first instructions | `documentation/ai_implementation/implementation-instructions.md` | Gate de diseno y validacion por feature |
| Intent router spec | `documentation/specs/contracts/components/intent-router.spec.md` | Contrato actual de clasificacion de intencion |
| Conversation processor spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Reglas de orquestacion y politicas de seguridad |
| OpenClaw runtime spec | `documentation/specs/contracts/components/openclaw-runtime.spec.md` | Contrato de invocacion/failover del adapter OpenClaw |
| Config matrix | `documentation/operations/config-matrix.md` | Registro de flags/env vars y efectos operativos |

## Contexto
Se quiere ampliar OpenClaw para cubrir mas inteligencia de parseo/ruteo sin sacrificar seguridad operativa. El runtime ya contiene un bloque deterministico extenso para intents read-only y mutaciones, y hoy OpenClaw se usa sobre todo en `intent_router` (alto nivel) y parser `gasto/pedido`.
El objetivo de esta fase es mover el ruteo/extraccion de intents read-only (incluyendo `quote.order`) a una capa OpenClaw controlada, manteniendo autoridad final en runtime para validacion, confirmaciones y ejecucion.

## Alcance
### In Scope
- Agregar capa OpenClaw para intents read-only: `report.orders`, `order.lookup`, `order.status`, `schedule.day_view`, `shopping.list.generate`, `quote.order`.
- Introducir feature flags de rollout gradual para activar/desactivar la nueva ruta sin romper la ruta actual.
- Mantener en runtime la autoridad final: validaciones, prompts de faltantes, confirmaciones, dedupe/idempotencia y ejecucion de tools.
- Preservar `quote -> pedido` con puente controlado y doble confirmacion existente.
- Actualizar specs/documentacion/config tests de acuerdo con enfoque spec-first.

### Out of Scope
- Delegar mutaciones (`order.update`, `order.cancel`, `payment.record`, `inventory.consume`) a OpenClaw en esta fase.
- Cambiar contratos de tools externos (Sheets/Trello/Web) o politicas de confirmacion.
- Ejecutar flujos live o cambios de integracion fuera de pruebas mock/local.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir contrato tipado para parser/router read-only OpenClaw | Completed | `src/skills/readOnlyIntentRouter.ts` con schema y normalizacion |
| 2 | Implementar capa OpenClaw read-only en `src/skills` | Completed | Ruteo para `report/lookup/status/schedule/shopping/quote` |
| 3 | Integrar la capa en `conversationProcessor` con feature flags | Completed | Integracion previa a detectores read-only deterministas |
| 4 | Mantener fallback por politica de modo | Completed | `strict=1` sin fallback read-only, `strict=0` con fallback local |
| 5 | Mantener mutaciones en ruta deterministica actual | Completed | Sin cambios de rutas para update/cancel/payment/inventory |
| 6 | Extender `AppConfig`, snapshot runtime y healthcheck | Completed | Flags nuevos + logs + health detail |
| 7 | Actualizar specs C4 + config docs (spec-first) | Completed | Specs/runtime/config matrix/.env actualizados |
| 8 | Ejecutar bateria de pruebas unit/runtime/config y smoke mock | Completed | Tests + smokes mock ejecutados en modo seguro |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Fase 1 solo read-only (incluye `quote.order`) | Reduce riesgo en operaciones mutables y acelera impacto en UX/parseo | 2026-03-19 |
| Runtime conserva autoridad final | Mantiene seguridad, trazabilidad, confirmacion e idempotencia existentes | 2026-03-19 |
| En `OPENCLAW_STRICT=1`, politica conservadora | Evita fallback ambiguo en intents nuevos; prioriza control/claridad | 2026-03-19 |
| En `OPENCLAW_STRICT=0`, usar fallback local actual | Preserva continuidad operacional y regresiones minimas | 2026-03-19 |
| Rollout gradual por feature flags | Permite activar por etapas y rollback instantaneo sin revertir codigo | 2026-03-19 |

## Validation
- Tests a ejecutar:
  - `npm test -- src/skills/intentRouter.test.ts src/skills/parser.test.ts`
  - `npm test -- src/runtime/conversationProcessor.test.ts`
  - `npm test -- src/config/appConfig.test.ts src/health/healthcheck.test.ts`
  - `npm run smoke:report`
  - `npm run smoke:lookup`
  - `npm run smoke:status`
  - `npm run smoke:schedule`
  - `npm run smoke:quote`
- Criterio de aceptacion:
  - Con flags OFF, comportamiento actual sin cambios funcionales.
  - Con flags ON, intents read-only y `quote.order` enrutan por la nueva capa OpenClaw manteniendo respuestas/errores controlados.
  - Ninguna mutacion cambia de ruta ni omite confirmacion.
  - Trazas y healthcheck exponen claramente estado de flags y origen de ruteo.

- Evidencia ejecutada:
  - `npm test -- src/skills/readOnlyIntentRouter.test.ts src/config/appConfig.test.ts src/health/healthcheck.test.ts src/runtime/conversationProcessor.test.ts` ✅
  - `SMOKE_CHAT_ID=smoke-readonly-openclaw-20260319 SMOKE_REPORT_LIVE=0 SMOKE_LOOKUP_LIVE=0 SMOKE_STATUS_LIVE=0 SMOKE_SCHEDULE_LIVE=0 SMOKE_QUOTE_LIVE=0 npm run smoke:report` ✅
  - `SMOKE_CHAT_ID=smoke-readonly-openclaw-20260319 ... npm run smoke:lookup` ✅
  - `SMOKE_CHAT_ID=smoke-readonly-openclaw-20260319 ... npm run smoke:status` ✅
  - `SMOKE_CHAT_ID=smoke-readonly-openclaw-20260319 ... npm run smoke:schedule` ✅
  - `SMOKE_CHAT_ID=smoke-readonly-openclaw-20260319 ... npm run smoke:quote` ✅

## Outcome
Se implemento la capa OpenClaw-first para intents read-only bajo feature flags, manteniendo runtime como autoridad final y sin afectar rutas de mutacion. La validacion paso con 100 tests en la bateria focal y smokes mock de report/lookup/status/schedule/quote en modo seguro.
