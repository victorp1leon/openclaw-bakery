---
name: report.reminders
description: Use when user asks for upcoming delivery reminders by period in read-only mode with urgency and trace reference.
---

# skill: report.reminders

## Overview
Consulta recordatorios operativos de entregas proximas en modo read-only, con prioridad por urgencia (`atrasado`, `proximo<=2h`, `proximo`) y referencia trazable.

## When To Use
- El usuario pide recordatorios de entregas/pedidos proximos.
- Se necesita vista accionable por periodo (`hoy`, `semana`, `mes`, `año`).
- El flujo debe ser read-only sin confirmacion.

## When Not To Use
- Mutaciones de pedidos/pagos/inventario.
- Agenda detallada por bloques de produccion (`schedule.day_view` / `schedule.week_view`).
- Lookup puntual de un pedido especifico (`order.lookup` / `order.status`).

## Input Contract
- Periodo soportado:
  - `today` / `tomorrow` / `week`
  - `day|week|month|year` estructurado
- Si falta periodo, runtime solicita `order_reminders_period`.

## Output Contract
- Respuesta con:
  - periodo aplicado
  - total de recordatorios
  - lista priorizada por urgencia/tiempo restante
  - `inconsistencies[]` visibles (fechas invalidas)
  - `Ref: <trace_ref>`
- Sin confirm flow y sin mutaciones externas.

## Workflow
1. Detectar intencion de recordatorios.
2. Resolver periodo objetivo.
3. Leer datos de pedidos (read-only) y derivar urgencia por fecha de entrega.
4. Ordenar y resumir recordatorios.
5. Responder con `trace_ref` y bloque de inconsistencias cuando aplique.

## Safety Constraints
- Nunca escribir en sistemas externos.
- No exponer secretos, stderr crudo o internals de provider.
- Mantener errores controlados con `Ref`.

## Common Mistakes
- Confundir `report.reminders` con `report.orders` (listado general).
- Omitir aclaracion de periodo cuando la consulta es ambigua.
- Ocultar inconsistencias de fechas invalidas.
