# Session Handoff: Phase 3 Order Connectors Spec v2 Foundation - 2026-03-04

> **Plan:** `documentation/ai_collaboration/plans/platform/implementation/phase3-order-connectors-spec-v2-foundation.md`
> **Date:** `2026-03-04`
> **Owner:** `Codex + Dev`

## What Was Done
- Se creo plan formal para arranque de Fase 3 (`order.create`) con alcance documental.
- Se actualizo `create-card.spec.md` de stub v1 a contrato v2 connector-ready (Trello auth, retry, idempotencia, dry-run seguro).
- Se actualizo `append-order.spec.md` de stub v1 a contrato v2 connector-ready (Apps Script + API key, retry, idempotencia).
- Se actualizo la matriz DDD para reflejar que el diseno v2 ya esta cerrado y que el siguiente bloque es implementacion + tests + smoke.
- Se actualizo `_index.md` con el plan como completado.

## Current State
- Fase 3 tiene contratos de adapters listos para implementar.
- El codigo en `src/tools/order/*` sigue en stub (sin conectores reales todavia).

## Open Issues
- Faltan variables de configuracion, healthcheck y wiring runtime para ejecutar `order.create` real.
- Falta coverage de tests de adapters order.

## Next Steps
1. Implementar `createCardTool` real (Trello) segun spec v2.
2. Implementar `appendOrderTool` real (Sheets/Apps Script) segun spec v2.
3. Agregar tests de adapters y smoke `order`.
4. Integrar ejecucion real de `pedido` en `conversationProcessor` al confirmar.

## Key Decisions
- Mantener `dry-run` como default en ambos adapters de order hasta completar hardening/config.
- Hacer obligatoria autenticacion en live mode para Trello y Sheets.
- Estandarizar dedupe por `operation_id` en ambos conectores.
