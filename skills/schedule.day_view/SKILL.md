---
name: schedule.day_view
description: Use when user asks for daily agenda by day/date and needs read-only delivery, preparation, purchases, inconsistencies, and trace reference.
---

# skill: schedule.day_view

## Overview
Consulta la agenda diaria en modo read-only usando `Pedidos` y responde en bloques operativos:
- `deliveries`
- `preparation`
- `suggestedPurchases`

Tambien reporta:
- `inconsistencies` (datos incompletos o invalidos detectados)
- `trace_ref` (referencia para soporte en exito/error)

## When To Use
- El usuario pide agenda del dia (`hoy`, `manana` o fecha explicita).
- Se necesita plan operativo diario sin mutar sistemas externos.
- Se requiere visibilidad de datos problematicos sin detener toda la respuesta.

## When Not To Use
- Mutaciones de pedidos/pagos/inventario.
- Reportes agregados por semana/mes/anio (`report.orders`).
- Consulta de estado puntual por pedido (`order.status`).

## Input Contract
- Texto libre en espanol con intencion de agenda diaria.
- Query de fecha:
  - relativa (`hoy`, `manana`)
  - explicita (`2026-03-20`, `20/03/2026`)
- Si no hay fecha clara, runtime solicita `schedule_day_query`.

## Output Contract
- Respuesta read-only con bloques `deliveries`, `preparation`, `suggestedPurchases`.
- `inconsistencies[]` visible cuando existen filas excluidas o datos invalidos.
- `trace_ref` visible para soporte.
- Sin confirm flow (`confirmar|cancelar`) y sin mutaciones.

## Workflow
1. Detectar intencion de agenda diaria.
2. Resolver fecha objetivo (default timezone del sistema).
3. Leer `Pedidos` via `gws` (solo lectura).
4. Filtrar filas activas para agenda usando `fecha_hora_entrega_iso` como fuente obligatoria.
5. Excluir cancelados y filas no agendables; registrar `inconsistencies`.
6. Construir respuesta resumida con bloques operativos y `trace_ref`.

## Safety Constraints
- Nunca escribir en fuentes externas.
- No ocultar errores de datos: exponerlos en `inconsistencies`.
- No exponer secretos, stderr crudo o detalles internos del provider.
- En fallo controlado, responder con `Ref: <trace_ref>`.

## Common Mistakes
- Intentar agendar con `fecha_hora_entrega` libre en lugar de `fecha_hora_entrega_iso`.
- Tratar datos invalidos como fallo total en vez de inconsistencia parcial.
- Omitir `trace_ref` en respuestas de error.
