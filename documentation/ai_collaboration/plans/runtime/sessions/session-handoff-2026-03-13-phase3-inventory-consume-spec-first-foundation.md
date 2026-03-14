# Session Handoff: Phase 3 - inventory.consume spec-first foundation - 2026-03-13

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-consume-spec-first-foundation.md`
> **Date:** `2026-03-13`
> **Owner:** `Codex + Dev`

## What Was Done
- Se creo `documentation/c4/ComponentSpecs/Tools/Specs/inventory-consume.spec.md`.
- Se actualizo `conversation-processor.spec.md` con regla y caso minimo para `inventory.consume` bajo `confirmar/cancelar`.
- Se actualizaron `system-map`, `bot-bakery.roadmap.md` y `ddd-roadmap-coverage-matrix.md` para reflejar estado spec-first.
- Se abrio plan de implementacion en estado `In Progress`.

## Current State
- Contrato funcional/tecnico de `inventory.consume` ya esta definido (mutacion + idempotencia + trazabilidad en movimientos).
- Estado DDD de `inventory.consume` paso de `Planned` a `Partial` (diseno listo, sin codigo aun).

## Open Issues
- Falta implementar tool y routing runtime.
- Falta cobertura de tests unitarios/runtime y smoke dedicado.

## Next Steps
1. Implementar `inventory.consume` en `src/tools/order/` con policy de stock y escritura auditable.
2. Integrar ruta determinista + confirm flow en `src/runtime/conversationProcessor.ts`.
3. Agregar tests y smoke de mutacion controlada.

## Key Decisions
- Mantener `inventory.consume` como mutacion confirmable y no como accion automatica silenciosa.
