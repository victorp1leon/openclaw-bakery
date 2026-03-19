# Session Handoff: OpenClaw Read-Only Routing Expansion V1 - 2026-03-19

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/openclaw-readonly-routing-expansion-v1.md`
> **Date:** `2026-03-19`
> **Owner:** `Codex + Dev`

## What Was Done
- Se agrego `src/skills/readOnlyIntentRouter.ts` para ruteo/extraccion OpenClaw-first de intents read-only (`report.orders`, `order.lookup`, `order.status`, `schedule.day_view`, `shopping.list.generate`, `quote.order`).
- Se integro la capa en `src/runtime/conversationProcessor.ts` con flags `OPENCLAW_READONLY_ROUTING_ENABLE` y `OPENCLAW_READONLY_QUOTE_ENABLE`.
- Se aplico politica de fallback acordada:
  - `OPENCLAW_STRICT=1`: sin fallback read-only determinista cuando OpenClaw responde `unknown`.
  - `OPENCLAW_STRICT=0`: fallback determinista read-only habilitado.
- Se mantuvieron sin cambios las rutas deterministas de mutacion (`order.update`, `order.cancel`, `payment.record`, `inventory.consume`).
- Se actualizaron config/log/health (`src/config/appConfig.ts`, `src/index.ts`, `src/health/healthcheck.ts`) para exponer flags nuevos.
- Se actualizo documentacion spec-first y operativa (`conversation-processor.spec`, `intent-router.spec`, spec nueva `read-only-intent-router.spec`, `system.description`, `config-matrix`, `.env.example`).

## Current State
- Feature implementada y validada con tests unit/runtime/config/health.
- Smokes read-only ejecutados en modo mock seguro con flags live forzados en `0`.
- Plan e indice de planes marcados como `Complete`.

## Open Issues
- No hay bloqueos funcionales abiertos.
- Riesgo conocido: precision de clasificacion OpenClaw puede variar por prompt/modelo; mitigado con flags de rollout y fallback no estricto.

## Next Steps
1. Habilitar `OPENCLAW_READONLY_ROUTING_ENABLE=1` en entorno de prueba controlado y monitorear trazas `readonly_intent_routed`.
2. Si la precision es estable, activar gradualmente en produccion manteniendo `OPENCLAW_STRICT=0` durante el warm-up.
3. Evaluar ajuste de prompt/normalizacion para casos ambiguos detectados en operacion real.

## Key Decisions
- OpenClaw solo propone en capa read-only; runtime mantiene autoridad final.
- `quote.order` se incluye en la capa OpenClaw, pero con control independiente por flag.
- En modo estricto se prioriza seguridad operacional sobre fallback automatico.
