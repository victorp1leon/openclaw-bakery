# Smoke Readonly Trace Observability v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-20`
> **Last Updated:** `2026-03-20`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| AGENTS policy | `AGENTS.md` | Guardrails de aprobacion y continuidad |
| Skill smoke integration | `.codex/skills/test-smoke-integration/SKILL.md` | Flujo de validacion smoke/integration |
| Summary generator | `scripts/tests/generate-smoke-integration-summary.ts` | Artefacto objetivo para señal de traza |
| Runtime trace source | `src/runtime/conversationProcessor.ts` | Emision de `readonly_intent_routed` |

## Contexto
Se detecto un gap de observabilidad: el resumen smoke+integration no valida de forma explicita la traza `readonly_intent_routed`. Esto deja pendiente manual el rollout de OpenClaw read-only entre sesiones.

## Alcance
### In Scope
- Agregar smoke mock-safe dedicado para validar emision de `readonly_intent_routed`.
- Integrar el smoke nuevo al `test:smoke-integration:summary`.
- Actualizar skill operativa para dejar visible la nueva validacion.
- Cerrar artefactos de colaboracion (plan/index/handoff).

### Out of Scope
- Cambios en runtime productivo del flujo de intents.
- Activaciones live en Telegram/produccion.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear smoke de traza read-only OpenClaw | Complete | Nuevo script `readonly-routing-trace-smoke.ts` |
| 2 | Integrar smoke al summary generator | Complete | Escenario `smoke:readonly-routing-trace` agregado |
| 3 | Validar en ejecucion y actualizar skill/docs | Complete | Smoke nuevo + summary `72/72` en verde |
| 4 | Cerrar plan/index/handoff | Complete | Artefactos de colaboracion actualizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Implementar smoke dedicado (no piggyback en otro smoke) | Evita coupling accidental y deja señal trazable/estable en reportes | 2026-03-20 |

## Validation
- Tests a ejecutar:
  - `npm run smoke:readonly-routing-trace`
  - `SMOKE_SUMMARY_LIVE=0 npm run test:smoke-integration:summary`
- Criterio de aceptacion:
  - El smoke nuevo termina en `PASS`.
  - `latest-summary.md` incluye una fila PASS del escenario de traza read-only.
- Resultado:
  - `npm run smoke:readonly-routing-trace` -> PASS
  - `SMOKE_SUMMARY_LIVE=0 npm run test:smoke-integration:summary` -> Total `72`, Passed `72`, Failed `0`

## Outcome
Quedo cerrada la observabilidad automatizada para `readonly_intent_routed` dentro del flujo smoke+integration. El resumen ahora incluye escenario dedicado (`smoke:readonly-routing-trace`) y permite detectar regresiones de ruteo read-only sin depender de verificacion manual entre sesiones.
