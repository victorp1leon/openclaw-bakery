# Session Handoff: Smoke Readonly Trace Observability v1 - 2026-03-20

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/smoke-readonly-trace-observability-v1.md`
> **Date:** `2026-03-20`
> **Owner:** `Codex + Dev`

## What Was Done
- Se agrego smoke dedicado `scripts/smoke/readonly-routing-trace-smoke.ts` para validar la traza `readonly_intent_routed`.
- Se registro el comando `npm run smoke:readonly-routing-trace` en `package.json`.
- Se integro el escenario `smoke:readonly-routing-trace` en `scripts/tests/generate-smoke-integration-summary.ts`.
- Se actualizo `.codex/skills/test-smoke-integration/SKILL.md` con la nueva validacion y comando de diagnostico.
- Se corrio validacion completa en modo seguro (`SMOKE_SUMMARY_LIVE=0`).

## Current State
- El summary smoke+integration incluye fila explicita de traza read-only OpenClaw.
- Estado de validacion actual: `Total 72`, `Passed 72`, `Failed 0`.
- Se redujo dependencia de verificacion manual para detectar regresiones de ruteo read-only.

## Open Issues
- El monitoreo con trafico real sigue siendo una operacion aparte (staging/produccion), fuera de este cambio mock-safe.

## Next Steps
1. En rollout real, observar eventos `readonly_intent_routed` en logs operativos y comparar con precision esperada.
2. Si aparece regresion, re-ejecutar `npm run smoke:readonly-routing-trace` + `npm run test:smoke-integration:summary` para triage rapido.

## Key Decisions
- Se eligio smoke dedicado en lugar de mezclar la validacion en `smoke:status` para mantener señal estable y trazabilidad clara en reportes.
