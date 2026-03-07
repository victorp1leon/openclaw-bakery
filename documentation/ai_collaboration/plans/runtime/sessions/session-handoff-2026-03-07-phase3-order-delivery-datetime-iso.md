# Session Handoff: Phase 3 Order Delivery Datetime ISO - 2026-03-07

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/phase3-order-delivery-datetime-iso.md`
> **Date:** `2026-03-07`
> **Owner:** `Codex + Dev`

## What Was Done
- Se agrego util `normalizeDeliveryDateTime` para convertir texto libre de entrega a datetime local normalizado.
- `append-order` ahora:
  - conserva `fecha_hora_entrega` original,
  - agrega `fecha_hora_entrega_iso` en payload webhook,
  - agrega columna extra `fecha_hora_entrega_iso` en append por `gws`.
- `report-orders` ahora filtra por `fecha_hora_entrega_iso` cuando existe, con fallback al campo texto original.
- Se agregaron/actualizaron pruebas para normalizacion, append y reportes.

## Current State
- Flujo de pedido no cambia para el usuario final.
- El dataset de pedidos empieza a almacenar datetime normalizado sin perder el texto libre.
- Reportes `hoy/manana/esta semana` son mas confiables en filas nuevas con columna ISO.

## Open Issues
- Filas historicas sin `fecha_hora_entrega_iso` siguen dependiendo de parseo best-effort de texto.
- No hay migracion retroactiva automatica de pedidos existentes.

## Next Steps
1. Agregar script opcional para backfill de `fecha_hora_entrega_iso` en filas historicas parseables.
2. Evaluar uso de `fecha_hora_entrega_iso` para due date de Trello cuando venga en texto relativo.

## Key Decisions
- Se eligio columna adicional (no reemplazo) para no perder trazabilidad del texto original capturado por chat.
- Se mantuvo compatibilidad hacia atras en reportes via fallback.
