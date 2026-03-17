# Session Handoff: inventory.consume v1 implementation - 2026-03-17

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/phase3-inventory-consume-spec-first-foundation.md`
> **Date:** `2026-03-17`
> **Owner:** `Codex + Dev`

## What Was Done
- Se implemento `src/tools/order/inventoryConsume.ts` con:
  - resolucion de referencia (`folio|operation_id_ref`) y rechazo por ambiguedad/conflicto.
  - bloqueo para `estado_pedido=cancelado`.
  - consumo de receta con conversion obligatoria `g<->kg` (aritmetica canonica en gramos).
  - idempotencia por `operation_id` + `order_ref` leyendo `MovimientosInventario`.
  - escritura de decremento en `Inventario` y append auditable en `MovimientosInventario`.
  - fallo parcial controlado con detalle de reconciliacion manual.
- Se integro runtime en `src/runtime/conversationProcessor.ts`:
  - deteccion fallback de `inventory.consume` por comando explicito.
  - confirm flow completo + ask de `order_reference` cuando falte.
  - guard de feature flag `INVENTORY_CONSUME_ENABLE`.
  - mensaje de replay: `Consumo ya aplicado para <folio>. operation_id: <id>`.
- Se extendio configuracion/wiring:
  - `src/config/appConfig.ts` + tests para bloque `inventoryConsume`.
  - `src/index.ts` con wiring de tool + logging de config + flag runtime.
- Se agrego cobertura:
  - `src/tools/order/inventoryConsume.test.ts` (16 casos).
  - `src/runtime/conversationProcessor.test.ts` (3 casos nuevos de inventory consume).
  - smoke `scripts/smoke/inventory-consume-smoke.ts`, script npm `smoke:inventory`, y registro en `generate-smoke-integration-summary.ts`.

## Current State
- `inventory.consume` disponible en runtime bajo comando explicito + confirmacion + feature flag.
- Tests y smoke en mock pasando.
- Reporte consolidado smoke+integration generado sin fallos.

## Open Issues
- Pendiente validacion live de negocio para criterio de salida: 3 corridas exitosas sin reconciliacion manual.

## Next Steps
1. Ejecutar smoke live controlado (`SMOKE_INVENTORY_LIVE=1`) con folios reales en entorno aprobado.
2. Documentar evidencia de 3 corridas live y cerrar adopcion operativa en roadmap/runbook.

## Key Decisions
- MVP mantiene `inventory.consume` solo por comando explicito (sin auto-trigger desde `order.create`) para reducir riesgo operativo.
- En fallos parciales se prioriza `fail + reconciliacion manual` sobre rollback complejo de inventario.
